use crate::core::errors::AppError;
use serde::Serialize;
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

#[derive(Clone, Debug)]
pub struct Vault {
    pub root: PathBuf,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Ext {
    Md,
    Typ,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultInfo {
    pub root: String,
    pub mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub path: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ext: Option<Ext>,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub path: String,
    pub ext: Ext,
    pub content: String,
}

pub fn app_data_dir() -> Result<PathBuf, AppError> {
    let home = std::env::var("HOME")
        .map_err(|_| AppError::new("NO_HOME", "Could not determine the home directory."))?;
    let dir = PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("GitNotes");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn canonicalize_vault(path: impl AsRef<Path>) -> Result<Vault, AppError> {
    let root = fs::canonicalize(path.as_ref())?;
    if !root.is_dir() {
        return Err(AppError::new("NOT_A_DIRECTORY", "Vault path is not a directory."));
    }
    Ok(Vault { root })
}

pub fn ensure_vault_layout(vault: &Vault) -> Result<(), AppError> {
    fs::create_dir_all(vault.root.join("quick"))?;
    fs::create_dir_all(vault.root.join(".archive"))?;
    let gitignore = vault.root.join(".gitignore");
    if !gitignore.exists() {
        fs::write(
            gitignore,
            ".DS_Store\n.gitnotes/\n.gitnotes-*\n*.tmp\n*.swp\n",
        )?;
    }
    Ok(())
}

pub fn safe_relative_path(path: &str) -> Result<PathBuf, AppError> {
    let rel = path.replace('\\', "/");
    let rel = rel.trim_start_matches("./");
    let mut out = PathBuf::new();
    for component in Path::new(rel).components() {
        match component {
            Component::Normal(part) => out.push(part),
            Component::CurDir => {}
            _ => {
                return Err(AppError::new(
                    "INVALID_PATH",
                    "Path must stay inside the open vault.",
                ));
            }
        }
    }
    Ok(out)
}

pub fn resolve_existing(vault: &Vault, rel: &str) -> Result<PathBuf, AppError> {
    let joined = vault.root.join(safe_relative_path(rel)?);
    let abs = fs::canonicalize(&joined)?;
    if !abs.starts_with(&vault.root) {
        return Err(AppError::new(
            "PATH_TRAVERSAL",
            "Resolved path escapes the open vault.",
        ));
    }
    Ok(abs)
}

pub fn resolve_for_write(vault: &Vault, rel: &str) -> Result<PathBuf, AppError> {
    let safe = safe_relative_path(rel)?;
    let target = vault.root.join(&safe);
    let parent = target
        .parent()
        .ok_or_else(|| AppError::new("INVALID_PATH", "Path has no parent directory."))?;
    let parent = fs::canonicalize(parent)?;
    if !parent.starts_with(&vault.root) {
        return Err(AppError::new(
            "PATH_TRAVERSAL",
            "Resolved path escapes the open vault.",
        ));
    }
    if target.exists() {
        let existing = fs::canonicalize(&target)?;
        if !existing.starts_with(&vault.root) {
            return Err(AppError::new(
                "PATH_TRAVERSAL",
                "Resolved path escapes the open vault.",
            ));
        }
    }
    Ok(target)
}

pub fn normalize_rel(path: &Path, vault: &Vault) -> Result<String, AppError> {
    let rel = path
        .strip_prefix(&vault.root)
        .map_err(|_| AppError::new("PATH_TRAVERSAL", "Path is outside the vault."))?;
    Ok(rel
        .components()
        .map(|component| component.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join("/"))
}

pub fn ext_for_path(path: &Path) -> Option<Ext> {
    match path.extension().and_then(|ext| ext.to_str()) {
        Some("md") => Some(Ext::Md),
        Some("typ") => Some(Ext::Typ),
        _ => None,
    }
}

pub fn title_from_content(path: &str, content: &str) -> String {
    content
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(|line| {
            line.trim_start_matches('#')
                .trim_start_matches('=')
                .trim()
                .to_string()
        })
        .filter(|title| !title.is_empty())
        .unwrap_or_else(|| {
            Path::new(path)
                .file_stem()
                .and_then(|name| name.to_str())
                .unwrap_or(path)
                .to_string()
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn safe_relative_path_rejects_parent_traversal() {
        assert!(safe_relative_path("../secret").is_err());
        assert!(safe_relative_path("a/../../secret").is_err());
        assert!(safe_relative_path("notes/../../../etc/passwd").is_err());
    }

    #[test]
    fn safe_relative_path_rejects_absolute() {
        assert!(safe_relative_path("/absolute/path").is_err());
    }

    #[test]
    fn safe_relative_path_accepts_normal() {
        let p = safe_relative_path("notes/hello.md").unwrap();
        assert_eq!(p.to_string_lossy(), "notes/hello.md");

        let p = safe_relative_path("./notes/hello.md").unwrap();
        assert_eq!(p.to_string_lossy(), "notes/hello.md");

        let p = safe_relative_path("file.md").unwrap();
        assert_eq!(p.to_string_lossy(), "file.md");
    }

    #[test]
    fn resolve_existing_rejects_traversal() {
        let tmp = TempDir::new().unwrap();
        let vault = Vault { root: fs::canonicalize(tmp.path()).unwrap() };
        assert!(resolve_existing(&vault, "../outside").is_err());
        assert!(resolve_existing(&vault, "a/../../outside").is_err());
    }

    #[test]
    fn resolve_existing_rejects_symlink_escape() {
        let tmp = TempDir::new().unwrap();
        let vault_root = fs::canonicalize(tmp.path()).unwrap();
        let vault = Vault { root: vault_root.clone() };

        let external = TempDir::new().unwrap();
        let external_root = fs::canonicalize(external.path()).unwrap();
        fs::write(external_root.join("secret.md"), "secret").unwrap();

        let link = vault_root.join("escape");
        std::os::unix::fs::symlink(&external_root, &link).unwrap();

        let result = resolve_existing(&vault, "escape/secret.md");
        assert!(result.is_err(), "Symlink escape should be rejected");
    }

    #[test]
    fn resolve_for_write_rejects_traversal() {
        let tmp = TempDir::new().unwrap();
        let vault = Vault { root: fs::canonicalize(tmp.path()).unwrap() };
        assert!(resolve_for_write(&vault, "../outside.md").is_err());
    }

    #[test]
    fn title_from_markdown_heading() {
        assert_eq!(
            title_from_content("notes/foo.md", "# Hello World\n\nBody"),
            "Hello World"
        );
        assert_eq!(
            title_from_content("notes/foo.md", "## Second Level\n\nBody"),
            "Second Level"
        );
    }

    #[test]
    fn title_from_typst_heading() {
        assert_eq!(
            title_from_content("notes/foo.typ", "= My Title\n\nBody"),
            "My Title"
        );
        assert_eq!(
            title_from_content("notes/foo.typ", "== Section\n\nBody"),
            "Section"
        );
    }

    #[test]
    fn title_falls_back_to_filename() {
        assert_eq!(title_from_content("notes/my-note.md", ""), "my-note");
        assert_eq!(title_from_content("notes/my-note.md", "   \n\n  "), "my-note");
    }

    #[test]
    fn normalize_rel_produces_posix_path() {
        let tmp = TempDir::new().unwrap();
        let vault_root = fs::canonicalize(tmp.path()).unwrap();
        let vault = Vault { root: vault_root.clone() };

        let abs = vault_root.join("subdir").join("note.md");
        let rel = normalize_rel(&abs, &vault).unwrap();
        assert_eq!(rel, "subdir/note.md");
    }
}
