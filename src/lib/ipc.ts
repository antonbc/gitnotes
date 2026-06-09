import { invoke } from "@tauri-apps/api/core";
import type {
  FileContent,
  FileNode,
  GitStatus,
  RemoteStatus,
  SearchHit,
  TrashEntry,
  TypstResult,
  VaultInfo
} from "$lib/types";

export const ipc = {
  ping: () => invoke<string>("ping"),
  pickAndOpenVault: () => invoke<VaultInfo | null>("pick_and_open_vault"),
  openVault: (path: string) => invoke<VaultInfo>("open_vault", { path }),
  listFiles: () => invoke<FileNode>("list_files"),
  readFile: (path: string) => invoke<FileContent>("read_file", { path }),
  writeFile: (path: string, content: string) =>
    invoke<void>("write_file", { path, content }),
  createFile: (dir: string, name: string, ext: "md" | "typ") =>
    invoke<FileNode>("create_file", { dir, name, ext }),
  renameFile: (from: string, to: string) =>
    invoke<void>("rename_file", { from, to }),
  moveFile: (from: string, toDir: string) =>
    invoke<void>("move_file", { from, toDir }),
  trashFile: (path: string) => invoke<string>("trash_file", { path }),
  restoreFile: (trashId: string) => invoke<void>("restore_file", { trashId }),
  listTrash: () => invoke<TrashEntry[]>("list_trash"),
  revealInFinder: (path: string) => invoke<void>("reveal_in_finder", { path }),
  search: (query: string) => invoke<SearchHit[]>("search", { query }),
  reindex: () => invoke<void>("reindex"),
  indexPaths: (paths: string[]) => invoke<void>("index_paths", { paths }),
  compileTypst: (path: string, content: string) =>
    invoke<TypstResult>("compile_typst", { path, content }),
  checkGitAvailable: () => invoke<boolean>("check_git_available"),
  gitRemoteStatus: () => invoke<RemoteStatus>("git_remote_status"),
  gitStatus: () => invoke<GitStatus>("git_status"),
  convertVaultToGit: (remoteUrl: string) =>
    invoke<void>("convert_vault_to_git", { remoteUrl }),
  setGitRemote: (url: string) => invoke<void>("set_git_remote", { url }),
  gitPull: () => invoke<{ conflicts: string[] }>("git_pull"),
  gitCommitPush: (message: string) =>
    invoke<void>("git_commit_push", { message }),
  gitResolveConflict: (path: string, resolvedContent: string) =>
    invoke<void>("git_resolve_conflict", { path, resolvedContent })
};
