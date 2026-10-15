import { client } from "../api/default-client";
import type { Layers } from "../ui/layers";
import { useNotices } from "../ui/notices";
import { useHistory } from "./useHistory";
import type { useTasks } from "./useTasks";

/** History loads when its layer is on top; a restore reloads the list and offers Undo. */
export function useHistoryLayer(tasks: ReturnType<typeof useTasks>, layers: Layers) {
  const notices = useNotices();
  return useHistory(client, {
    active: layers.top === "history",
    onRestored: (title, undo) => {
      void tasks.refresh();
      notices.show({ message: `Back on the list: ${title}`, tone: "info", undo: () => void Promise.resolve(undo()).then(() => tasks.refresh()) });
    },
  });
}
