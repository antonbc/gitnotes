use crate::{core::{errors::AppError, index}, state::AppState};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn search(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<index::SearchHit>, AppError> {
    let db = state.db()?;
    index::search(&db, &query)
}

#[tauri::command]
pub fn reindex(app: AppHandle, state: State<'_, AppState>) -> Result<(), AppError> {
    let vault = state.vault()?;
    let mut db = state.db()?;
    index::reindex_vault(&mut db, &vault, Some(&app))
}
