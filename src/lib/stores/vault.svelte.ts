import type { FileNode, VaultInfo } from "$lib/types";

export const vaultState = $state<{
  info: VaultInfo | null;
  tree: FileNode | null;
  ping: string;
  indexProgress: { done: number; total: number } | null;
}>({
  info: null,
  tree: null,
  ping: "",
  indexProgress: null
});
