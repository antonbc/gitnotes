import type { GitStatus } from "$lib/types";

export const syncState = $state<{
  status: GitStatus | null;
  gitAvailable: boolean;
  remoteInput: string;
  conflicts: string[];
  message: string;
}>({
  status: null,
  gitAvailable: false,
  remoteInput: "",
  conflicts: [],
  message: ""
});
