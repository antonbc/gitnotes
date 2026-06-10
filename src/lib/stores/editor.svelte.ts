import { SvelteSet } from "svelte/reactivity";
import type { Ext, ViewMode } from "$lib/types";

export interface OpenTab {
  path: string;
  ext: Ext;
  content: string;
  savedContent: string;
  dirty: boolean;
  /** Disk content changed externally while this tab has unsaved edits. */
  diskStale?: boolean;
}

export const editorState = $state<{
  tabs: OpenTab[];
  activePath: string | null;
  viewMode: ViewMode;
  vimMode: boolean;
  toolbar: boolean;
  /**
   * Paths written to disk but not yet committed/pushed. Must stay a
   * SvelteSet: plain Sets are not proxied by $state, so add/delete would
   * not update the commit/push button or the status-bar badge.
   */
  localChanges: SvelteSet<string>;
  /** autosave debounce in flight */
  saving: boolean;
  saveError: string | null;
  lastSavedAt: number | null;
  cursor: { ln: number; col: number };
  selection: { chars: number; ranges: number };
  lineCount: number;
  wordCount: number;
  charCount: number;
}>({
  tabs: [],
  activePath: null,
  viewMode: "split",
  vimMode: true,
  toolbar: true,
  localChanges: new SvelteSet(),
  saving: false,
  saveError: null,
  lastSavedAt: null,
  cursor: { ln: 1, col: 1 },
  selection: { chars: 0, ranges: 0 },
  lineCount: 0,
  wordCount: 0,
  charCount: 0,
});
