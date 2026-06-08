# GitNotes

Fast local-first notes for macOS. GitNotes edits plain `.md` and `.typ` files in a user-selected vault, previews Markdown and Typst, indexes notes with SQLite FTS5 in app data, and syncs a vault to any Git remote through the system `git` CLI.

## Stack

- Tauri v2
- Svelte 5 + TypeScript + Vite
- CodeMirror 6 with optional Vim mode
- Rust commands for all file IO, Typst, Git, search, trash, and Finder reveal

## Development

```sh
npm install
npm run tauri dev
```

`npm run tauri dev` leaves the dev server in normal interactive mode. `npm run tauri build` sets `CI=true` only for the build subcommand so Tauri's DMG script skips Finder automation that can fail in headless/local automation sessions.

## Verification

```sh
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

The release artifacts are written to:

- `src-tauri/target/release/bundle/macos/GitNotes.app`
- `src-tauri/target/release/bundle/dmg/GitNotes_0.1.0_aarch64.dmg`

## Vault Rules

- Notes are plain files in the vault.
- Supported note extensions are `.md` and `.typ`.
- `quick/` is for quick capture.
- `.archive/` is reserved and excluded from the default tree/search.
- `.git/` is always ignored by the watcher.
- Trash lives outside the vault in `~/Library/Application Support/GitNotes/trash`.
- Search index lives outside the vault in `~/Library/Application Support/GitNotes/index.sqlite`.

## Signing

The release workflow builds on macOS and fails early if Developer ID and notarytool secrets are missing. Required secrets:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## License

MIT. Typst bundled font asset notices are included in `NOTICE`.
