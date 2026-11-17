import { useEffect, useRef } from "react";
import { Button, Flex, Text } from "@radix-ui/themes";
import type { ChatPhoto } from "./useChatPhoto";

export function ChatAttachment({ attachment, disabled }: { attachment: ChatPhoto; disabled: boolean }) {
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = picker.current, cancelled = () => attachment.picking(false);
    input?.addEventListener("cancel", cancelled);
    return () => input?.removeEventListener("cancel", cancelled);
  }, [attachment.picking]);
  return <div className="chat-attachment">
    <input ref={picker} type="file" hidden accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/tiff,image/gif,.heic,.heif" aria-label="Choose chat screenshot" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void attachment.add(files); }} />
    {attachment.item ? <>
      <Flex gap="2" align="center"><img className="chat-photo-preview" src={`data:image/png;base64,${attachment.item.photo.data}`} alt={`Attached ${attachment.item.name}`} /><Text size="1" className="grow">{attachment.item.name}</Text><Button type="button" size="1" variant="ghost" aria-label="Remove attachment" disabled={disabled} onClick={attachment.remove}>Remove</Button></Flex>
      <Text as="p" size="1" color="gray">Send shares this image; it is not saved.</Text>
    </> : <Button type="button" size="1" variant="ghost" disabled={disabled || attachment.loading} onClick={() => { attachment.picking(true); picker.current?.click(); }}>Attach screenshot or photo</Button>}
    {attachment.loading && <Flex gap="2" align="center"><Text role="status" size="1">Preparing screenshot…</Text><Button type="button" size="1" variant="ghost" onClick={attachment.remove}>Cancel attachment</Button></Flex>}
    {attachment.error && <Text as="p" size="1" role="alert" color="red">{attachment.error}</Text>}
  </div>;
}
