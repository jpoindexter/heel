import { CaretDownIcon } from "@radix-ui/react-icons";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { MODES, isComposeMode, modeInfo, type ComposeMode } from "./compose-model";

/** What Enter will do, said in one word, and the way to change it. */
export function ModeMenu({ mode, onMode }: { mode: ComposeMode; onMode: (mode: ComposeMode) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button type="button" size="2" radius="full" variant="soft" color="gray" className="mode-button" aria-label={`What Enter does: ${modeInfo(mode).menu}`}>
          {modeInfo(mode).label}
          <CaretDownIcon aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content size="1" align="start" side="top">
        <DropdownMenu.RadioGroup value={mode} onValueChange={(value) => isComposeMode(value) && onMode(value)}>
          {MODES.map((item) => (
            <DropdownMenu.RadioItem key={item.id} value={item.id}>{item.menu}</DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
