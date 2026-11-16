import { useState } from "react";
import { Button, Checkbox, Flex, Text, TextArea } from "@radix-ui/themes";
import { useLayers } from "../ui/layers";
import type { Photos } from "./usePhotos";

export function PhotoAssistant({ photos }: { photos: Photos }) {
  const [question, setQuestion] = useState(""), [instruction, setInstruction] = useState(""), [transparent, setTransparent] = useState(false);
  const layers = useLayers();
  return <>
    <details><summary>Ask about this photo</summary><div className="settings-section">
      <Button size="1" variant="soft" disabled={photos.busy} onClick={() => void photos.ask("Read all the visible text.", true)}>Read text on this Mac</Button>
      <Text as="label" size="2">Question<TextArea value={question} maxLength={4000} disabled={photos.busy} placeholder="Describe it, identify details or suggest what to do…" onChange={event => setQuestion(event.target.value)} /></Text>
      <Text size="1" color="gray">Asking sends the working photo and question to {photos.status.provider ?? "your selected AI"}. Reading text above stays on this Mac.</Text>
      <Flex gap="2" wrap="wrap"><Button size="1" disabled={photos.busy || !question.trim()} onClick={() => void photos.ask(question)}>Ask AI</Button><Button size="1" variant="soft" disabled={photos.busy} onClick={() => void photos.ask("Describe this photo and any important visible details.")}>Describe photo</Button></Flex>
    </div></details>
    <details><summary>Make an AI edit</summary><div className="settings-section">
      <Text as="label" size="2">Edit instruction<TextArea value={instruction} maxLength={4000} disabled={photos.busy} placeholder="Remove an object, change the setting or make a creative variation…" onChange={event => setInstruction(event.target.value)} /></Text>
      <Text as="label" size="2"><Checkbox disabled={photos.busy} checked={transparent} onCheckedChange={value => setTransparent(value === true)} /> Transparent background</Text>
      <Text as="p" size="1" color="gray">Generative edits use your Codex ChatGPT subscription. This photo and instruction go to Codex’s image tool. Review the result; it can change details.</Text>
      {!photos.status.generativeReady && <><Text size="1">Install or update Codex and sign in with ChatGPT, then reopen Photos. No API key is needed. Local tools above need no sign-in.</Text><Button size="1" variant="soft" onClick={() => layers.push("settings")}>Open Codex settings</Button></>}
      <Button size="1" disabled={photos.busy || !photos.status.generativeReady || !instruction.trim()} onClick={() => void photos.edit(instruction, transparent)}>Generate edited copy</Button>
    </div></details>
    {photos.item?.answer && <Text as="p" size="2" className="photo-answer" role="status">{photos.item.answer}</Text>}
  </>;
}
