import { Button } from "@radix-ui/themes";
import { useLayers } from "../ui/layers";

export function ApplicationLink() {
  const layers = useLayers();
  return <Button size="1" variant="soft" onClick={() => layers.push("applications")}>Review application</Button>;
}
