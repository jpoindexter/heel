import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import type { Photo } from "../../shared/photos";
import { client } from "../api/default-client";
import { importPhoto } from "../photos/import-photo";
import { photoFiles } from "../photos/input";

export function useChatPhoto(busy: boolean) {
  const [item, setItem] = useState<{ name: string; photo: Photo } | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null), current = useRef(item); current.current = item;
  const choosing = useRef(false);
  useEffect(() => () => pending.current?.abort(), []);
  const add = async (files: File[]) => {
    choosing.current = false;
    if (!files.length) return;
    if (busy || pending.current) return setError("Wait for the current operation to finish before attaching another image.");
    if (files.length !== 1) return setError("Attach one screenshot or photo per message.");
    const control = new AbortController(); pending.current = control; setLoading(true); setError("");
    try { const photo = await importPhoto(client, files[0]!, control.signal); if (!control.signal.aborted) setItem({ name: files[0]!.name || "Pasted photo", photo }); }
    catch (failure) { if (!control.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not attach this photo."); }
    finally { pending.current = null; setLoading(false); }
  };
  const drop = (event: DragEvent) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.stopPropagation(); void add(photoFiles(event.dataTransfer)); } };
  const paste = (event: ClipboardEvent) => { const files = photoFiles(event.clipboardData); if (files.length) { event.preventDefault(); event.stopPropagation(); void add(files); } };
  const remove = () => { pending.current?.abort(); setItem(null); setError(""); };
  const isEmpty = useCallback(() => !current.current && !pending.current && !choosing.current, []);
  const picking = useCallback((value: boolean) => { choosing.current = value; }, []);
  return { item, loading, error, add, drop, paste, remove, isEmpty, picking };
}
export type ChatPhoto = ReturnType<typeof useChatPhoto>;
