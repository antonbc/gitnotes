import type { Ext } from "$lib/types";

export type RenameResolution =
  | { kind: "noop" }
  | { kind: "invalid"; message: string }
  | { kind: "target"; path: string; ext: Ext };

function dirName(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(0, idx) : "";
}

function extFromPath(path: string): Ext {
  return path.endsWith(".typ") ? "typ" : "md";
}

/**
 * Resolve the rename-dialog input for the note at `path` into a vault-relative
 * target path. A plain name renames within the note's folder; an input with
 * `/` moves the note to that folder relative to the vault root (the backend
 * creates missing folders).
 */
export function resolveRenameInput(path: string, input: string): RenameResolution {
  const trimmed = input.trim();
  if (!trimmed) return { kind: "noop" };

  if (trimmed.includes("\\")) {
    return { kind: "invalid", message: "Use forward slashes (/) to move into a folder." };
  }

  const fromRoot = trimmed.startsWith("/");
  const segments = trimmed
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim());
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return { kind: "invalid", message: "Folder names cannot be empty, '.' or '..'." };
  }

  const name = segments[segments.length - 1];
  const hasSupportedExt = /\.(md|typ)$/i.test(name);
  const hasAnyExt = /\.[^./\\]+$/.test(name);
  if (hasAnyExt && !hasSupportedExt) {
    return { kind: "invalid", message: "GitNotes supports only .md and .typ notes." };
  }

  const currentExt = extFromPath(path);
  const fileName = hasSupportedExt ? name : `${name}.${currentExt}`;

  // Plain names stay in the note's folder; paths (or a leading "/") are
  // vault-root relative.
  const dir = segments.length > 1 ? segments.slice(0, -1).join("/") : fromRoot ? "" : dirName(path);
  const targetPath = dir ? `${dir}/${fileName}` : fileName;

  if (targetPath === path) return { kind: "noop" };
  return { kind: "target", path: targetPath, ext: extFromPath(fileName) };
}
