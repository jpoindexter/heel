import { expect, it } from "vitest";
import { photoBase64, photoFiles } from "./input";
it("deduplicates clipboard items and encodes exact image bytes", () => {
  const file = new File([new Uint8Array([0, 1, 254, 255])], "photo.png", { type: "image/png", lastModified: 1 });
  const item = { kind: "file", getAsFile: () => file };
  expect(photoFiles({ items: [item, item], files: [file] } as unknown as DataTransfer)).toEqual([file]);
  expect(photoBase64(new Uint8Array([0, 1, 254, 255]))).toBe("AAH+/w==");
});
