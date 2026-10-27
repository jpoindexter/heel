import { Heading, SegmentedControl } from "@radix-ui/themes";
import { DENSITIES, isDensity, type Density } from "../theme/density";
import { DENSITY_LABELS as LABELS } from "./settings-model";

type Props = { density: Density; onDensity: (next: Density) => void };

/** How big everything is. Compact is the default; Comfortable is roughly a tenth larger. */
export function DensitySettings({ density, onDensity }: Props) {
  return (
    <section aria-labelledby="density-heading" className="settings-section">
      <Heading as="h3" id="density-heading" size="2">Size</Heading>
      <SegmentedControl.Root size="1" value={density} onValueChange={(value) => isDensity(value) && onDensity(value)} aria-label="Size">
        {DENSITIES.map((choice) => (
          <SegmentedControl.Item key={choice} value={choice}>{LABELS[choice]}</SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
    </section>
  );
}
