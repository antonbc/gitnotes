import type { GitStatus } from "$lib/types";

export function canCommitPush(input: {
  status: GitStatus | null;
  conflicts: string[];
  dirtyTabCount: number;
  localChangeCount: number;
}): boolean {
  const { status, conflicts, dirtyTabCount, localChangeCount } = input;
  if (!status || conflicts.length > 0) return false;
  return (
    dirtyTabCount > 0 ||
    localChangeCount > 0 ||
    status.dirty ||
    status.ahead > 0
  );
}
