use crate::core::{
    errors::AppError,
    fs::{ext_for_path, normalize_rel, title_from_content, Vault},
};
use rusqlite::{params, Connection};
use serde::Serialize;
use std::{fs, path::Path};
use tauri::{AppHandle, Emitter};
use walkdir::{DirEntry, WalkDir};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub path: String,
    pub title: String,
    pub snippet: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct IndexProgress {
    pub done: usize,
    pub total: usize,
}

pub fn init(db: &Connection) -> Result<(), AppError> {
    db.execute_batch(
        "CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(path UNINDEXED, title, body);",
    )?;
    Ok(())
}

pub fn reindex_vault(
    db: &mut Connection,
    vault: &Vault,
    app: Option<&AppHandle>,
) -> Result<(), AppError> {
    let files = note_files(vault)?;
    db.execute("DELETE FROM notes_fts", [])?;
    let tx = db.transaction()?;
    let total = files.len();
    for (done, path) in files.iter().enumerate() {
        index_file_tx(&tx, vault, path)?;
        if let Some(app) = app {
            let _ = app.emit(
                "index_progress",
                IndexProgress {
                    done: done + 1,
                    total,
                },
            );
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn index_file(db: &Connection, vault: &Vault, abs: &Path) -> Result<(), AppError> {
    let rel = normalize_rel(abs, vault)?;
    db.execute("DELETE FROM notes_fts WHERE path = ?", params![rel])?;
    if abs.exists() && ext_for_path(abs).is_some() && !is_ignored(abs, vault) {
        let content = fs::read_to_string(abs)?;
        let title = title_from_content(&rel, &content);
        db.execute(
            "INSERT INTO notes_fts(path, title, body) VALUES (?, ?, ?)",
            params![rel, title, content],
        )?;
    }
    Ok(())
}

fn index_file_tx(tx: &rusqlite::Transaction<'_>, vault: &Vault, abs: &Path) -> Result<(), AppError> {
    let rel = normalize_rel(abs, vault)?;
    let content = fs::read_to_string(abs)?;
    let title = title_from_content(&rel, &content);
    tx.execute(
        "INSERT INTO notes_fts(path, title, body) VALUES (?, ?, ?)",
        params![rel, title, content],
    )?;
    Ok(())
}

pub fn search(db: &Connection, query: &str) -> Result<Vec<SearchHit>, AppError> {
    let like = format!("%{}%", query.trim());
    let fts = fts_query(query);
    let mut hits = Vec::new();

    if let Some(fts) = fts {
        let mut stmt = db.prepare(
            "SELECT path, title, snippet(notes_fts, 2, '<mark>', '</mark>', '...', 16) \
             FROM notes_fts WHERE notes_fts MATCH ? LIMIT 50",
        )?;
        let rows = stmt.query_map(params![fts], row_to_hit)?;
        for hit in rows {
            hits.push(hit?);
        }
    }

    let mut stmt = db.prepare(
        "SELECT path, title, substr(body, 1, 220) FROM notes_fts \
         WHERE path LIKE ? OR title LIKE ? LIMIT 50",
    )?;
    let rows = stmt.query_map(params![like, like], row_to_hit)?;
    for hit in rows {
        let hit = hit?;
        if !hits.iter().any(|existing| existing.path == hit.path) {
            hits.push(hit);
        }
    }

    hits.truncate(50);
    Ok(hits)
}

fn row_to_hit(row: &rusqlite::Row<'_>) -> rusqlite::Result<SearchHit> {
    Ok(SearchHit {
        path: row.get(0)?,
        title: row.get(1)?,
        snippet: row.get(2)?,
    })
}

fn fts_query(query: &str) -> Option<String> {
    let tokens = query
        .split(|ch: char| !ch.is_alphanumeric() && ch != '_')
        .filter(|token| !token.is_empty())
        .map(|token| format!("{}*", token.replace('"', "\"\"")))
        .collect::<Vec<_>>();
    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" AND "))
    }
}

pub fn note_files(vault: &Vault) -> Result<Vec<std::path::PathBuf>, AppError> {
    let mut files = Vec::new();
    for entry in WalkDir::new(&vault.root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| should_descend(entry))
    {
        let entry = entry.map_err(|err| AppError::new("WALKDIR_ERROR", err.to_string()))?;
        if entry.file_type().is_file() && ext_for_path(entry.path()).is_some() {
            files.push(entry.path().to_path_buf());
        }
    }
    Ok(files)
}

fn should_descend(entry: &DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy();
    !(entry.file_type().is_dir() && (name == ".git" || name == ".archive"))
}

fn is_ignored(path: &Path, vault: &Vault) -> bool {
    path.strip_prefix(&vault.root)
        .ok()
        .and_then(|rel| rel.components().next())
        .map(|component| {
            let first = component.as_os_str().to_string_lossy();
            first == ".git" || first == ".archive"
        })
        .unwrap_or(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{atomic_write::atomic_write, fs::Vault};
    use rusqlite::Connection;
    use std::fs;
    use tempfile::TempDir;

    fn make_db() -> Connection {
        let db = Connection::open_in_memory().unwrap();
        init(&db).unwrap();
        db
    }

    fn make_vault() -> (TempDir, Vault) {
        let tmp = TempDir::new().unwrap();
        let root = fs::canonicalize(tmp.path()).unwrap();
        let vault = Vault { root };
        (tmp, vault)
    }

    #[test]
    fn search_finds_indexed_body() {
        let db = make_db();
        let (_tmp, vault) = make_vault();
        let path = vault.root.join("hello.md");
        atomic_write(&path, "# Hello World\n\nThis is a note about testing.").unwrap();
        index_file(&db, &vault, &path).unwrap();

        let hits = search(&db, "testing").unwrap();
        assert!(!hits.is_empty());
        assert_eq!(hits[0].title, "Hello World");
    }

    #[test]
    fn search_by_title() {
        let db = make_db();
        let (_tmp, vault) = make_vault();
        let path = vault.root.join("unique.md");
        atomic_write(&path, "# Zephyr Quantum\n\nBody text.").unwrap();
        index_file(&db, &vault, &path).unwrap();

        let hits = search(&db, "Zephyr").unwrap();
        assert!(!hits.is_empty());
        assert_eq!(hits[0].path, "unique.md");
    }

    #[test]
    fn reindex_removes_stale_then_reindexes() {
        let db = make_db();
        let (_tmp, vault) = make_vault();
        let path = vault.root.join("note.md");
        atomic_write(&path, "# Note\n\nStale content.").unwrap();
        index_file(&db, &vault, &path).unwrap();

        fs::remove_file(&path).unwrap();
        index_file(&db, &vault, &path).unwrap();

        let hits = search(&db, "Stale").unwrap();
        assert!(hits.is_empty(), "Deleted file should not appear in search");
    }

    #[test]
    fn reindex_vault_indexes_multiple_files() {
        let mut db = make_db();
        let (_tmp, vault) = make_vault();

        atomic_write(&vault.root.join("alpha.md"), "# Alpha\n\nFirst note.").unwrap();
        atomic_write(&vault.root.join("beta.md"), "# Beta\n\nSecond note.").unwrap();
        atomic_write(&vault.root.join("gamma.typ"), "= Gamma\n\nThird note.").unwrap();

        reindex_vault(&mut db, &vault, None).unwrap();

        assert!(!search(&db, "Alpha").unwrap().is_empty());
        assert!(!search(&db, "Beta").unwrap().is_empty());
        assert!(!search(&db, "Gamma").unwrap().is_empty());
    }

    #[test]
    fn archive_dir_is_excluded_from_index() {
        let mut db = make_db();
        let (_tmp, vault) = make_vault();

        fs::create_dir(vault.root.join(".archive")).unwrap();
        atomic_write(&vault.root.join(".archive").join("old.md"), "# Secret\n\nArchived.").unwrap();
        atomic_write(&vault.root.join("visible.md"), "# Visible\n\nLive note.").unwrap();

        reindex_vault(&mut db, &vault, None).unwrap();

        assert!(search(&db, "Secret").unwrap().is_empty(), ".archive should be excluded");
        assert!(!search(&db, "Visible").unwrap().is_empty());
    }
}
