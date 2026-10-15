import { ArrowLeftIcon, ChevronRightIcon, Cross2Icon, GearIcon } from "@radix-ui/react-icons";
import { Button, Heading, IconButton, Text } from "@radix-ui/themes";
import { TITLES } from "../ui/layers-model";
import { useLayers } from "../ui/layers";

/** At the root: the name and the gear. In a layer: Back, where you are in a word, and Forward when there is somewhere to go. */
export function PanelHeader({ onClose }: { onClose: () => void }) {
  const layers = useLayers();
  const inLayer = layers.top !== "today";
  return (
    <header data-tauri-drag-region className="panel-header">
      {inLayer ? (
        <>
          <Button variant="ghost" color="gray" size="1" onClick={layers.back}>
            <ArrowLeftIcon aria-hidden="true" /> {layers.under === "today" ? "Back" : TITLES[layers.under]}
          </Button>
          <Heading as="h1" size="2" data-tauri-drag-region className="grow">{TITLES[layers.top]}</Heading>
        </>
      ) : (
        <>
          <Text size="1" weight="medium" color="gray" data-tauri-drag-region className="panel-title grow">Heel</Text>
          <IconButton variant="ghost" color="gray" aria-label="Settings" onClick={() => layers.push("settings")}>
            <GearIcon aria-hidden="true" />
          </IconButton>
        </>
      )}
      {layers.stack.forward.length > 0 && (
        <IconButton variant="ghost" color="gray" aria-label={`Forward to ${TITLES[layers.stack.forward[layers.stack.forward.length - 1] ?? "today"]}`} onClick={layers.forward}>
          <ChevronRightIcon aria-hidden="true" />
        </IconButton>
      )}
      <IconButton variant="ghost" color="gray" aria-label="Close panel" onClick={onClose}>
        <Cross2Icon aria-hidden="true" />
      </IconButton>
    </header>
  );
}
