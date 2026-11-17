import { MAX_PHOTO_BYTES, PhotoImportResultSchema } from "../../shared/photos";
import type { Client } from "../api/client";
import { photoBase64 } from "./input";

/** Import stays on the Mac; only an explicit Ask or Send may upload the working image. */
export async function importPhoto(client: Client, file: File, signal: AbortSignal) {
  if (file.size > MAX_PHOTO_BYTES) throw new Error(`${file.name} is larger than 20 MB. Choose a smaller copy.`);
  if (!/^image\/(png|jpe?g|webp|tiff|gif|hei[cf])$/i.test(file.type) && !/\.(png|jpe?g|webp|tiff?|gif|hei[cf])$/i.test(file.name)) throw new Error("Choose PNG, JPEG, HEIC, WebP, TIFF or GIF photos.");
  const result = await client.post("/photos/import", PhotoImportResultSchema, { data: photoBase64(new Uint8Array(await file.arrayBuffer())) }, signal);
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
