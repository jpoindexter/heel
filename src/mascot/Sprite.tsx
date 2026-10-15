import { cellOrigin } from "./timeline";
import { parseMotionId, type MotionId } from "./sheets";
import { useHitRegion } from "./useHitRegion";
import { useSpriteClock } from "./useSpriteClock";

type Props = { motion: MotionId; label: string };

/** Plays one animation from its sheet. Which sheet, how big a cell, how long each frame: all from the manifest. */
export function Sprite({ motion, label }: Props) {
  const found = parseMotionId(motion);
  if (!found) return null;
  return <SpritePlayer found={found} label={label} />;
}

function SpritePlayer({ found, label }: { found: NonNullable<ReturnType<typeof parseMotionId>>; label: string }) {
  const { sheet, action } = found;
  const { manifest } = sheet;
  const frame = useSpriteClock(action.durationsMs, action.loop ?? true, found.id);
  useHitRegion(sheet, action.row, frame);
  const { x, y } = cellOrigin(manifest, action.row, frame);
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
