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
    path::{Path, PathBuf},
    process::Command,
};
use tauri::State;

#[tauri::command]
pub async fn list_files(state: State<'_, AppState>) -> Result<FileNode, AppError> {
    let vault = state.vault()?;
    build_tree(&vault, &vault.root)
}

#[tauri::command]
pub async fn read_file(state: State<'_, AppState>, path: String) -> Result<FileContent, AppError> {
    let vault = state.vault()?;
    let abs = resolve_existing(&vault, &path)?;
    let ext = ext_for_path(&abs).ok_or_else(|| {
        AppError::new("UNSUPPORTED_FILE", "Only .md and .typ notes are supported.")
    })?;
    Ok(FileContent {
        path,
        ext,
        content: fs::read_to_string(abs)?,
    })
}

#[tauri::command]
pub async fn write_file(
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
pub async fn create_file(
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
        return Err(AppError::new(
            "NOT_A_DIRECTORY",
            "Target is not a directory.",
        ));
    }
    let base = sanitize_filename(&name);
    let stem = base
        .trim_end_matches(".md")
        .trim_end_matches(".typ")
        .trim()
        .to_string();
    let stem = if stem.is_empty() {
        "Untitled".to_string()
    } else {
        stem
    };
    let candidate = next_available_note_path(&dir_abs, &stem, &ext)?;
    atomic_write(&candidate, "")?;
    let db = state.db()?;
    index::index_file(&db, &vault, &candidate)?;
    file_node(&vault, &candidate)
}

#[tauri::command]
pub async fn rename_file(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> Result<(), AppError> {
    let vault = state.vault()?;
    let source = resolve_existing(&vault, &from)?;
    let target = resolve_for_write(&vault, &to)?;
    if ext_for_path(&source).is_none() || ext_for_path(&target).is_none() {
        return Err(AppError::new(
            "UNSUPPORTED_FILE",
            "Only .md and .typ notes are supported.",
        ));
    }
    if target.exists() {
        let same_file = fs::canonicalize(&target)
            .map(|existing| existing == source)
            .unwrap_or(false);
        if !same_file {
            return Err(AppError::new(
                "TARGET_EXISTS",
                "A note with that name already exists.",
            ));
        }
    }
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
pub async fn move_file(
    state: State<'_, AppState>,
    from: String,
    to_dir: String,
) -> Result<(), AppError> {
    let vault = state.vault()?;
    let source = resolve_existing(&vault, &from)?;
    let dir = resolve_existing(&vault, &to_dir)?;
    if !dir.is_dir() {
        return Err(AppError::new(
            "NOT_A_DIRECTORY",
            "Move target is not a directory.",
        ));
    }
    let name = source
        .file_name()
        .ok_or_else(|| AppError::new("INVALID_PATH", "Source path has no file name."))?;
    let target = dir.join(name);
    if target.exists() {
        let same_file = fs::canonicalize(&target)
            .map(|existing| existing == source)
            .unwrap_or(false);
        if !same_file {
            return Err(AppError::new(
                "TARGET_EXISTS",
                "A note with that name already exists in the target folder.",
            ));
        }
    }
    fs::rename(&source, &target)?;
    let db = state.db()?;
    db.execute("DELETE FROM notes_fts WHERE path = ?", [from])?;
    index::index_file(&db, &vault, &target)?;
    Ok(())
}

#[tauri::command]
pub async fn trash_file(state: State<'_, AppState>, path: String) -> Result<String, AppError> {
    let vault = state.vault()?;
    let trash_id = trash::trash(state.app_data(), &vault, &path)?;
    let db = state.db()?;
    db.execute("DELETE FROM notes_fts WHERE path = ?", [path])?;
    Ok(trash_id)
}

#[tauri::command]
pub async fn restore_file(state: State<'_, AppState>, trash_id: String) -> Result<(), AppError> {
    let vault = state.vault()?;
    trash::restore(state.app_data(), &vault, &trash_id)?;
    let mut db = state.db()?;
    index::reindex_vault(&mut db, &vault, None)?;
    Ok(())
}

#[tauri::command]
pub async fn list_trash(state: State<'_, AppState>) -> Result<Vec<trash::TrashEntry>, AppError> {
    trash::list(state.app_data())
}

#[tauri::command]
pub async fn reveal_in_finder(state: State<'_, AppState>, path: String) -> Result<(), AppError> {
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

/// Incrementally (re)index only the given relative paths. Used to keep the
/// search index fresh in response to filesystem watcher events without
/// re-walking and re-reading the entire vault on every change. `index_file`
/// removes the FTS row when the path no longer exists, so this also handles
/// deletions.
#[tauri::command]
pub async fn index_paths(state: State<'_, AppState>, paths: Vec<String>) -> Result<(), AppError> {
    let vault = state.vault()?;
    let db = state.db()?;
    for path in paths {
        let Ok(rel) = safe_relative_path(&path) else {
            continue;
        };
        let abs = vault.root.join(rel);
        index::index_file(&db, &vault, &abs)?;
    }
    Ok(())
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
            if node
                .children
                .as_ref()
                .map(|kids| !kids.is_empty())
                .unwrap_or(false)
            {
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
    name == ".git"
        || name == ".archive"
        || name.ends_with(".tmp")
        || name.ends_with(".swp")
        || path.file_name().is_none()
}

fn sanitize_filename(name: &str) -> String {
    let sanitized = name
        .chars()
        .filter(|ch| *ch != '/' && *ch != '\\' && *ch != ':')
        .collect::<String>();
    sanitized.trim().to_string()
}

fn next_available_note_path(dir: &Path, stem: &str, ext: &str) -> Result<PathBuf, AppError> {
    for idx in 1..=999 {
        let filename = if idx == 1 {
            format!("{stem}.{ext}")
        } else {
            format!("{stem} {idx}.{ext}")
        };
        let candidate = dir.join(filename);
        if !candidate.exists() {
            return Ok(candidate);
        }
    }

    Err(AppError::new(
        "NAME_EXHAUSTED",
        "No available filename could be found.",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn next_available_note_path_errors_after_exhausting_candidates() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("Untitled.md"), "").unwrap();
        for idx in 2..=999 {
            fs::write(dir.path().join(format!("Untitled {idx}.md")), "").unwrap();
        }

        let err = next_available_note_path(dir.path(), "Untitled", "md").unwrap_err();
        assert_eq!(err.code, "NAME_EXHAUSTED");
    }
}
