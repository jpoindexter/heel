import { cellOrigin } from "./timeline";
import { parseMotionId, type Motion, type MotionId } from "./sheets";
import { useHitRegion } from "./useHitRegion";
import { useSpriteClock } from "./useSpriteClock";

type Props = { motion: MotionId; label: string };

/** Plays one animation from its sheet. Which sheet, how big a cell, how long each frame: all from the manifest. */
export function Sprite({ motion, label }: Props) {
  const found = parseMotionId(motion);
  if (!found) return null;
  return <SpritePlayer found={found} label={label} />;
}

function SpritePlayer({ found, label }: { found: Motion; label: string }) {
  const { sheet, row, pose } = found;
  const { manifest } = sheet;
  const clockFrame = useSpriteClock(found.durationsMs, found.loop, found.id, pose !== null);
  const frame = pose ?? clockFrame;
  useHitRegion(sheet, row, frame);
  const { x, y } = cellOrigin(manifest, row, frame);
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: manifest.cellWidth,
        height: manifest.cellHeight,
        backgroundImage: `url(${sheet.url})`,
        backgroundSize: `${manifest.width}px ${manifest.height}px`,
        // 0 - n (not -n) so the first cell yields +0, never -0.
        backgroundPosition: `${0 - x}px ${0 - y}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
