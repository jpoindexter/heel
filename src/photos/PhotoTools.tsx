import { useEffect, useState } from "react";
import { Button, Checkbox, Flex, Text, TextField } from "@radix-ui/themes";
import type { Photo, PhotoTransform } from "../../shared/photos";

export function PhotoTools({ photo, busy, transform }: { photo: Photo; busy: boolean; transform: (value: PhotoTransform) => void }) {
  const [width, setWidth] = useState(photo.width), [height, setHeight] = useState(photo.height), [ratio, setRatio] = useState(true);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: photo.width, height: photo.height });
  useEffect(() => { setWidth(photo.width); setHeight(photo.height); setCrop({ x: 0, y: 0, width: photo.width, height: photo.height }); }, [photo]);
  const resizeWidth = (value: number) => { setWidth(value); if (ratio) setHeight(Math.max(1, Math.round(value * photo.height / photo.width))); };
  const resizeHeight = (value: number) => { setHeight(value); if (ratio) setWidth(Math.max(1, Math.round(value * photo.width / photo.height))); };
  return <div className="settings-section">
    <Flex gap="2" wrap="wrap">
      <Button size="1" variant="soft" disabled={busy} onClick={() => transform({ operation: "rotate", angle: -90 })}>Rotate left</Button>
      <Button size="1" variant="soft" disabled={busy} onClick={() => transform({ operation: "rotate", angle: 90 })}>Rotate right</Button>
    </Flex>
    <details><summary>Resize</summary><div className="settings-section">
      <Text as="label" size="2">Width in pixels<TextField.Root type="number" min="1" max="4096" value={width} disabled={busy} onChange={event => resizeWidth(Number(event.target.value))} /></Text>
      <Text as="label" size="2">Height in pixels<TextField.Root type="number" min="1" max="4096" value={height} disabled={busy} onChange={event => resizeHeight(Number(event.target.value))} /></Text>
      <Text as="label" size="2"><Checkbox checked={ratio} disabled={busy} onCheckedChange={value => setRatio(value === true)} /> Keep proportions</Text>
      <Button size="1" disabled={busy || width < 1 || height < 1 || width > 4096 || height > 4096} onClick={() => transform({ operation: "resize", width, height })}>Apply resize</Button>
    </div></details>
    <details><summary>Crop</summary><div className="settings-section">
      <Text size="1" color="gray">Coordinates start at the top-left corner.</Text>
      {(["x", "y", "width", "height"] as const).map(key => <Text key={key} as="label" size="2">Crop {key}<TextField.Root type="number" min={key === "x" || key === "y" ? 0 : 1} max={key === "x" || key === "width" ? photo.width : photo.height} value={crop[key]} disabled={busy} onChange={event => setCrop(current => ({ ...current, [key]: Number(event.target.value) }))} /></Text>)}
      <Button size="1" disabled={busy || crop.width < 1 || crop.height < 1 || crop.x < 0 || crop.y < 0 || crop.x + crop.width > photo.width || crop.y + crop.height > photo.height} onClick={() => transform({ operation: "crop", ...crop })}>Apply crop</Button>
    </div></details>
    <Button size="1" variant="soft" disabled={busy} onClick={() => transform({ operation: "remove-background" })}>Remove background on this Mac</Button>
  </div>;
}
