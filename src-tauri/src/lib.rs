mod commands;
mod core;
mod state;

use commands::{files, git, search, typst, vault};
use state::AppState;

#[tauri::command]
fn ping() -> &'static str {
    "pong from GitNotes"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::new().expect("failed to initialize GitNotes state");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            ping,
            vault::pick_and_open_vault,
            vault::open_vault,
            files::list_files,
            files::read_file,
            files::write_file,
            files::create_file,
            files::rename_file,
            files::move_file,
            files::trash_file,
            files::restore_file,
            files::list_trash,
            files::reveal_in_finder,
            files::index_paths,
            search::search,
            search::reindex,
            typst::compile_typst,
            git::check_git_available,
            git::git_remote_status,
            git::git_status,
            git::convert_vault_to_git,
            git::set_git_remote,
            git::git_pull,
            git::git_commit_push,
            git::git_resolve_conflict,
        ])
        .run(tauri::generate_context!())
        .expect("error while running GitNotes");
}
