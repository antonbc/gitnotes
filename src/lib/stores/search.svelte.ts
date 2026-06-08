import type { SearchHit } from "$lib/types";

export const searchState = $state<{
  query: string;
  hits: SearchHit[];
  paletteOpen: boolean;
}>({
  query: "",
  hits: [],
  paletteOpen: false
});
