use crate::core::errors::AppError;
use std::{io::Write, path::Path};
use tempfile::NamedTempFile;

pub fn atomic_write(path: &Path, content: &str) -> Result<(), AppError> {
    let dir = path
        .parent()
        .ok_or_else(|| AppError::new("INVALID_PATH", "Target path has no parent directory."))?;
    let mut tmp = NamedTempFile::new_in(dir)?;
    tmp.write_all(content.as_bytes())?;
    tmp.flush()?;
    tmp.as_file().sync_all()?;
    tmp.persist(path)
        .map_err(|err| AppError::new("ATOMIC_WRITE_FAILED", err.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn writes_and_reads_back() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("note.md");
        atomic_write(&path, "Hello, world!").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "Hello, world!");
    }

    #[test]
    fn overwrites_existing_file() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("note.md");
        atomic_write(&path, "First version").unwrap();
        atomic_write(&path, "Second version").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "Second version");
    }

    #[test]
    fn preserves_unicode_and_empty_string() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("unicode.md");
        let content = "# Ünïcödé テスト 🦀\n\n日本語テキスト";
        atomic_write(&path, content).unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), content);

        atomic_write(&path, "").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "");
    }

    #[test]
    fn file_exists_after_write() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("new.md");
        assert!(!path.exists());
        atomic_write(&path, "content").unwrap();
        assert!(path.exists());
    }
}
