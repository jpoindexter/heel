import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { PhotoAnswerSchema, PhotoImportResultSchema, PhotoSavedSchema, type Photo, type PhotoTransform } from "../../shared/photos";
import { client } from "../api/default-client";
import { importPhoto } from "./import-photo";

type Item = { id: string; name: string; photo: Photo; original: Photo; undo: Photo[]; answer: string; changed: boolean };
const StatusSchema = z.object({ generativeReady: z.boolean(), provider: z.string().nullable() });
function usePhotoWork() {
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState("");
  const controller = useRef<AbortController | null>(null);
  const work = async (run: (signal: AbortSignal) => Promise<void>) => {
    if (controller.current) return;
    const control = new AbortController(); controller.current = control; setBusy(true); setProblem("");
    try { await run(control.signal); }
    catch (error) { setProblem(error instanceof Error ? error.message : "The photo operation failed. Your original is unchanged."); }
    finally { controller.current = null; setBusy(false); }
  };
  useEffect(() => () => controller.current?.abort(), []);
  return { work, busy, problem, setProblem, stop: () => controller.current?.abort() };
}

export function usePhotos(active: boolean) {
  const [items, setItems] = useState<Item[]>([]), [selected, setSelected] = useState("");
  const [status, setStatus] = useState<z.infer<typeof StatusSchema>>({ generativeReady: false, provider: null });
  const [said, setSaid] = useState("");
  const job = usePhotoWork(), item = items.find(photo => photo.id === selected) ?? items[0] ?? null;
  useEffect(() => { if (active) void client.get("/photos/status", StatusSchema).then(result => { if (result.ok) setStatus(result.data); }); }, [active]);
  const update = (id: string, photo: Photo) => setItems(current => current.map(entry => entry.id === id ? { ...entry, photo, undo: [...entry.undo.slice(-2), entry.photo], answer: "", changed: true } : entry));
  const post = async <S extends z.ZodType>(path: string, schema: S, body: unknown, signal: AbortSignal) => {
    const result = await client.post(`/photos/${path}`, schema, body, signal);
    if (!result.ok) throw new Error(result.error.message);
    return result.data;
  };
  const add = (files: File[]) => job.work(async signal => {
    if (files.length + items.length > 4) throw new Error("Keep up to four photos open. Remove one before adding more.");
    for (const file of files) {
      const photo = await importPhoto(client, file, signal);
      const id = crypto.randomUUID(); setItems(current => [...current, { id, name: file.name || "Pasted photo", photo, original: photo, undo: [], answer: "", changed: false }]); setSelected(id);
      setSaid(photo.sourceWidth > photo.width || photo.sourceHeight > photo.height ? "Working copy reduced to fit 2048 pixels. The original file is untouched." : "Photo ready. Original file untouched.");
    }
  });
  const transform = (transform: PhotoTransform) => item && job.work(async signal => { const photo = await post("transform", PhotoImportResultSchema, { photo: item.photo, transform }, signal); update(item.id, photo); setSaid("Edit applied. Save a copy to keep it."); });
  const ask = (prompt: string, localText = false) => item && job.work(async signal => { const result = await post(localText ? "text" : "ask", PhotoAnswerSchema, localText ? item.photo : { photo: item.photo, prompt }, signal); setItems(current => current.map(entry => entry.id === item.id ? { ...entry, answer: result.answer } : entry)); });
  const edit = (prompt: string, transparent: boolean) => item && job.work(async signal => { const photo = await post("edit", PhotoImportResultSchema, { photo: item.photo, prompt, transparent }, signal); update(item.id, photo); setSaid("AI edit ready. Review it and save a copy to keep it."); });
  const save = () => item && job.work(async signal => { const result = await post("save", PhotoSavedSchema, item.photo, signal); setSaid(`Saved a new PNG copy: ${result.path}${result.revealed ? "" : ". Finder could not open; the file was saved."}`); setItems(current => current.map(entry => entry.id === item.id ? { ...entry, changed: false } : entry)); });
  const undo = () => item && setItems(current => current.map(entry => entry.id === item.id && entry.undo.length ? { ...entry, photo: entry.undo.at(-1)!, undo: entry.undo.slice(0, -1), answer: "", changed: true } : entry));
  const reset = () => item && update(item.id, item.original);
  const remove = () => item && setItems(current => current.filter(entry => entry.id !== item.id));
  return { ...job, items, item, selected: item?.id, select: setSelected, status, said, add, transform, ask, edit, save, undo, reset, remove };
}
export type Photos = ReturnType<typeof usePhotos>;
