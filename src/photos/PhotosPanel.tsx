import { useRef } from "react";
import { AlertDialog, Button, Flex, Text } from "@radix-ui/themes";
import { photoFiles } from "./input";
import { PhotoAssistant } from "./PhotoAssistant";
import { PhotoTools } from "./PhotoTools";
import type { Photos } from "./usePhotos";
import "./photos.css";

function RemovePhoto({ photos }: { photos: Photos }) {
  if (!photos.item?.changed) return <Button size="1" variant="ghost" disabled={photos.busy} onClick={photos.remove}>Remove photo</Button>;
  return <AlertDialog.Root><AlertDialog.Trigger><Button size="1" variant="ghost" disabled={photos.busy}>Remove photo</Button></AlertDialog.Trigger><AlertDialog.Content size="1"><AlertDialog.Title>Discard unsaved edits?</AlertDialog.Title><AlertDialog.Description>Your original file stays unchanged. Save a copy first if you want these edits.</AlertDialog.Description><Flex gap="2" mt="3"><AlertDialog.Cancel><Button variant="soft">Keep photo</Button></AlertDialog.Cancel><AlertDialog.Action><Button color="red" onClick={photos.remove}>Discard edits</Button></AlertDialog.Action></Flex></AlertDialog.Content></AlertDialog.Root>;
}
export function PhotosPanel({ photos }: { photos: Photos }) {
  const picker = useRef<HTMLInputElement>(null), item = photos.item;
  return <section className="settings settings-section" aria-label="Photos workspace" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!photos.busy) void photos.add(photoFiles(event.dataTransfer)); }} onPaste={event => { const files = photoFiles(event.clipboardData); if (files.length) { event.preventDefault(); if (!photos.busy) void photos.add(files); } }}>
    <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/tiff,image/gif,.heic,.heif" multiple hidden aria-label="Choose photos" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void photos.add(files); }} />
    <Button size="1" variant="soft" disabled={photos.busy} onClick={() => picker.current?.click()}>Add photos</Button>
    <Text as="p" size="1" color="gray">Choose, drop or paste up to four photos (20 MB each). Working copies fit 2048 pixels and omit source metadata. Original files stay untouched. GIF uses its first frame. Save edits before quitting Heel.</Text>
    <Flex gap="2" wrap="wrap">{photos.items.map(entry => <button type="button" key={entry.id} className="photo-thumb" disabled={photos.busy} aria-label={`Show ${entry.name}`} aria-pressed={entry.id === photos.selected} onClick={() => photos.select(entry.id)}><img src={`data:image/png;base64,${entry.photo.data}`} alt="" /></button>)}</Flex>
    {item && <>
      <Text as="p" size="2" weight="medium">{item.name} · {item.photo.width} × {item.photo.height}{item.changed ? " · unsaved edits" : ""}</Text>
      <img className="photo-preview" src={`data:image/png;base64,${item.photo.data}`} alt={`Preview of ${item.name}`} />
      <Flex gap="2" wrap="wrap"><Button size="1" disabled={photos.busy} onClick={() => void photos.save()}>Save PNG copy to Desktop</Button><Button size="1" variant="soft" disabled={photos.busy || !item.undo.length} onClick={photos.undo}>Undo edit</Button><Button size="1" variant="soft" disabled={photos.busy} onClick={photos.reset}>Reset to original</Button></Flex>
      <PhotoTools photo={item.photo} busy={photos.busy} transform={value => void photos.transform(value)} />
      <PhotoAssistant photos={photos} />
      <RemovePhoto photos={photos} />
    </>}
    {photos.busy && <Flex gap="2" align="center"><Text role="status" size="1">Working on the photo…</Text><Button size="1" variant="soft" onClick={photos.stop}>Stop</Button></Flex>}
    {photos.problem && <Text as="p" size="1" color="red" role="alert">{photos.problem}</Text>}
    {photos.said && <Text as="p" size="1" role="status">{photos.said}</Text>}
  </section>;
}
