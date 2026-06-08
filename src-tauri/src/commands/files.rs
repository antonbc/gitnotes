use crate::{
    core::{
        atomic_write::atomic_write,
        errors::AppError,
        fs::{
            ext_for_path, normalize_rel, resolve_existing, resolve_for_write, safe_relative_path,
            FileContent, FileNode, Vault,
        },
        index, trash,
    },
    state::AppState,
};
use std::{
    fs,
    path::Path,
    process::Command,
};
use tauri::State;

#[tauri::command]
pub fn list_files(state: State<'_, AppState>) -> Result<FileNode, AppError> {
    let vault = state.vault()?;
    build_tree(&vault, &vault.root)
}

#[tauri::command]
pub fn read_file(state: State<'_, AppState>, path: String) -> Result<FileContent, AppError> {
    let vault = state.vault()?;
    let abs = resolve_existing(&vault, &path)?;
    let ext = ext_for_path(&abs)
        .ok_or_else(|| AppError::new("UNSUPPORTED_FILE", "Only .md and .typ notes are supported."))?;
    Ok(FileContent {
        path,
        ext,
        content: fs::read_to_string(abs)?,
    })
}

#[tauri::command]
pub fn write_file(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<(), AppError> {
    let vault = state.vault()?;
    let abs = resolve_for_write(&vault, &path)?;
    if ext_for_path(&abs).is_none() {
        return Err(AppError::new(
            "UNSUPPORTED_FILE",
            "Only .md and .typ notes are supported.",
        ));
    }
    atomic_write(&abs, &content)?;
    let db = state.db()?;
    index::index_file(&db, &vault, &abs)?;
    Ok(())
}

#[tauri::command]
pub fn create_file(
    state: State<'_, AppState>,
    dir: String,
    name: String,
    ext: String,
) -> Result<FileNode, AppError> {
    if ext != "md" && ext != "typ" {
        return Err(AppError::new("INVALID_EXT", "Extension must be md or typ."));
    }
    let vault = state.vault()?;
    let dir_rel = safe_relative_path(&dir)?;
    let dir_abs = resolve_existing(&vault, dir_rel.to_string_lossy().as_ref())?;
    if !dir_abs.is_dir() {
        return Err(AppError::new("NOT_A_DIRECTORY", "Target is not a directory."));
    }
    let base = sanitize_filename(&name);
    let stem = base
        .trim_end_matches(".md")
        .trim_end_matches(".typ")
        .trim()
        .to_string();
    let stem = if stem.is_empty() { "Untitled".to_string() } else { stem };
    let mut candidate = dir_abs.join(format!("{stem}.{ext}"));
    for idx in 2..1000 {
        if !candidate.exists() {
            break;
        }
        candidate = dir_abs.join(format!("{stem} {idx}.{ext}"));
    }
    atomic_write(&candidate, "")?;
    let db = state.db()?;
    index::index_file(&db, &vault, &candidate)?;
    file_node(&vault, &candidate)
}

#[tauri::command]
pub fn rename_file(state: State<'_, AppState>, from: String, to: String) -> Result<(), AppError> {
    let vault = state.vault()?;
    let source = resolve_existing(&vault, &from)?;
    let target = resolve_for_write(&vault, &to)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(&source, &target)?;
    let db = state.db()?;
    db.execute("DELETE FROM notes_fts WHERE path = ?", [from])?;
    if target.is_file() {
        index::index_file(&db, &vault, &target)?;
    }
    Ok(())
}

#[tauri::command]
pub fn move_file(state: State<'_, AppState>, from: String, to_dir: String) -> Result<(), AppError> {
    let vault = state.vault()?;
    let source = resolve_existing(&vault, &from)?;
    let dir = resolve_existing(&vault, &to_dir)?;
    if !dir.is_dir() {
        return Err(AppError::new("NOT_A_DIRECTORY", "Move target is not a directory."));
    }
    let name = source
        .file_name()
        .ok_or_else(|| AppError::new("INVALID_PATH", "Source path has no file name."))?;
    let target = dir.join(name);
    fs::rename(&source, &target)?;
    let db = state.db()?;
    db.execute("DELETE FROM notes_fts WHERE path = ?", [from])?;
    index::index_file(&db, &vault, &target)?;
    Ok(())
}

#[tauri::command]
pub fn trash_file(state: State<'_, AppState>, path: String) -> Result<String, AppError> {
    let vault = state.vault()?;
    let trash_id = trash::trash(state.app_data(), &vault, &path)?;
    let db = state.db()?;
    db.execute("DELETE FROM notes_fts WHERE path = ?", [path])?;
    Ok(trash_id)
}

#[tauri::command]
pub fn restore_file(state: State<'_, AppState>, trash_id: String) -> Result<(), AppError> {
    let vault = state.vault()?;
    trash::restore(state.app_data(), &vault, &trash_id)?;
    let mut db = state.db()?;
    index::reindex_vault(&mut db, &vault, None)?;
    Ok(())
}

#[tauri::command]
pub fn list_trash(state: State<'_, AppState>) -> Result<Vec<trash::TrashEntry>, AppError> {
    trash::list(state.app_data())
}

#[tauri::command]
pub fn reveal_in_finder(state: State<'_, AppState>, path: String) -> Result<(), AppError> {
    let vault = state.vault()?;
    let abs = resolve_existing(&vault, &path)?;
    let output = Command::new("open").arg("-R").arg(abs).output()?;
    if output.status.success() {
        Ok(())
    } else {
        Err(AppError::new(
            "FINDER_ERROR",
            String::from_utf8_lossy(&output.stderr).to_string(),
        ))
    }
}

fn build_tree(vault: &Vault, dir: &Path) -> Result<FileNode, AppError> {
    let mut children = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        if should_skip(&path, &name) {
            continue;
        }
        if path.is_dir() {
            let node = build_tree(vault, &path)?;
            if node.children.as_ref().map(|kids| !kids.is_empty()).unwrap_or(false) {
                children.push(node);
            }
        } else if ext_for_path(&path).is_some() {
            children.push(file_node(vault, &path)?);
        }
    }
    children.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name)));
    let name = if dir == vault.root {
        vault
            .root
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Vault")
            .to_string()
    } else {
        dir.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string()
    };
    Ok(FileNode {
        path: normalize_rel(dir, vault).unwrap_or_default(),
        name,
        ext: None,
        is_dir: true,
        children: Some(children),
    })
}

fn file_node(vault: &Vault, path: &Path) -> Result<FileNode, AppError> {
    Ok(FileNode {
        path: normalize_rel(path, vault)?,
        name: path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string(),
        ext: ext_for_path(path),
        is_dir: false,
        children: None,
    })
}

fn should_skip(path: &Path, name: &str) -> bool {
    name == ".git" || name == ".archive" || name.ends_with(".tmp") || name.ends_with(".swp")
        || path.file_name().is_none()
}

fn sanitize_filename(name: &str) -> String {
    let sanitized = name
        .chars()
        .filter(|ch| *ch != '/' && *ch != '\\' && *ch != ':')
        .collect::<String>();
    sanitized.trim().to_string()
}
