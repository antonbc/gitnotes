use crate::core::{
    atomic_write::atomic_write,
    errors::AppError,
    fs::{resolve_for_write, safe_relative_path, Vault},
};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashEntry {
    pub trash_id: String,
    pub original_path: String,
    pub deleted_at: String,
}

pub fn list(app_data: &Path) -> Result<Vec<TrashEntry>, AppError> {
    read_manifest(app_data)
}

pub fn trash(app_data: &Path, vault: &Vault, rel: &str) -> Result<String, AppError> {
    let source = crate::core::fs::resolve_existing(vault, rel)?;
    let trash_dir = app_data.join("trash");
    fs::create_dir_all(&trash_dir)?;
    let trash_id = unique_trash_id(&trash_dir, rel);
    let dest = trash_dir.join(&trash_id);
    fs::rename(source, dest)?;

    let mut manifest = read_manifest(app_data)?;
    manifest.push(TrashEntry {
        trash_id: trash_id.clone(),
        original_path: rel.to_string(),
        deleted_at: now_secs().to_string(),
    });
    write_manifest(app_data, &manifest)?;
    Ok(trash_id)
}

pub fn restore(app_data: &Path, vault: &Vault, trash_id: &str) -> Result<(), AppError> {
    let mut manifest = read_manifest(app_data)?;
    let idx = manifest
        .iter()
        .position(|entry| entry.trash_id == trash_id)
        .ok_or_else(|| AppError::new("TRASH_NOT_FOUND", "Trash item does not exist."))?;
    let entry = manifest.remove(idx);
    let source = app_data.join("trash").join(&entry.trash_id);
    if !source.exists() {
        return Err(AppError::new(
            "TRASH_NOT_FOUND",
            "The trashed file is missing from app data.",
        ));
    }
    let mut target = resolve_for_write(vault, &entry.original_path)?;
    if target.exists() {
        target = dedupe_restore_target(vault, &entry.original_path)?;
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::rename(source, target)?;
    write_manifest(app_data, &manifest)?;
    Ok(())
}

fn manifest_path(app_data: &Path) -> PathBuf {
    app_data.join("trash").join("trash.json")
}

fn read_manifest(app_data: &Path) -> Result<Vec<TrashEntry>, AppError> {
    let path = manifest_path(app_data);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content)?)
}

fn write_manifest(app_data: &Path, entries: &[TrashEntry]) -> Result<(), AppError> {
    let trash_dir = app_data.join("trash");
    fs::create_dir_all(&trash_dir)?;
    let content = serde_json::to_string_pretty(entries)?;
    atomic_write(&manifest_path(app_data), &content)
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}

fn now_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default()
}

fn unique_trash_id(trash_dir: &Path, rel: &str) -> String {
    let base = format!("{}-{}", now_nanos(), sanitize_id(rel));
    if !trash_dir.join(&base).exists() {
        return base;
    }

    for idx in 2.. {
        let candidate = format!("{base}-{idx}");
        if !trash_dir.join(&candidate).exists() {
            return candidate;
        }
    }

    unreachable!("unbounded trash id search should always return")
}

fn sanitize_id(path: &str) -> String {
    path.chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
                ch
            } else {
                '-'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{atomic_write::atomic_write, fs::Vault};
    use std::fs;
    use tempfile::TempDir;

    fn setup() -> (TempDir, TempDir, Vault) {
        let app_data = TempDir::new().unwrap();
        let vault_dir = TempDir::new().unwrap();
        let root = fs::canonicalize(vault_dir.path()).unwrap();
        let vault = Vault { root };
        (app_data, vault_dir, vault)
    }

    #[test]
    fn trash_removes_from_vault_and_restore_returns_it() {
        let (app_data, _vault_dir, vault) = setup();
        let note_path = vault.root.join("test.md");
        atomic_write(&note_path, "# Test Note\n\nContent.").unwrap();

        let trash_id = trash(app_data.path(), &vault, "test.md").unwrap();
        assert!(
            !note_path.exists(),
            "File should be gone from vault after trash"
        );

        let entries = list(app_data.path()).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].original_path, "test.md");

        restore(app_data.path(), &vault, &trash_id).unwrap();
        assert!(note_path.exists(), "File should be back after restore");
        assert_eq!(
            fs::read_to_string(&note_path).unwrap(),
            "# Test Note\n\nContent."
        );

        let entries = list(app_data.path()).unwrap();
        assert!(entries.is_empty(), "Trash should be empty after restore");
    }

    #[test]
    fn restore_renames_if_original_path_occupied() {
        let (app_data, _vault_dir, vault) = setup();
        atomic_write(&vault.root.join("note.md"), "Original").unwrap();
        let trash_id = trash(app_data.path(), &vault, "note.md").unwrap();
        atomic_write(&vault.root.join("note.md"), "New occupant").unwrap();

        restore(app_data.path(), &vault, &trash_id).unwrap();

        assert!(
            vault.root.join("note 2.md").exists(),
            "Should restore with deduped name"
        );
        assert_eq!(
            fs::read_to_string(vault.root.join("note 2.md")).unwrap(),
            "Original"
        );
    }

    #[test]
    fn trash_nonexistent_file_returns_error() {
        let (app_data, _vault_dir, vault) = setup();
        assert!(trash(app_data.path(), &vault, "does_not_exist.md").is_err());
    }

    #[test]
    fn restore_unknown_trash_id_returns_error() {
        let (app_data, _vault_dir, vault) = setup();
        assert!(restore(app_data.path(), &vault, "bogus-id").is_err());
    }
}

fn dedupe_restore_target(vault: &Vault, original: &str) -> Result<PathBuf, AppError> {
    let safe = safe_relative_path(original)?;
    let stem = safe
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("restored");
    let ext = safe.extension().and_then(|ext| ext.to_str()).unwrap_or("");
    let parent = safe.parent().unwrap_or_else(|| Path::new(""));
    for idx in 2..1000 {
        let name = if ext.is_empty() {
            format!("{stem} {idx}")
        } else {
            format!("{stem} {idx}.{ext}")
        };
        let candidate = vault.root.join(parent).join(name);
        if !candidate.exists() {
            return Ok(candidate);
        }
    }
    Err(AppError::new(
        "RESTORE_CONFLICT",
        "Could not find an available restore filename.",
    ))
}
