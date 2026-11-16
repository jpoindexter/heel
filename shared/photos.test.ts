import { expect, it } from "vitest";
import { PhotoDataSchema, PhotoSchema, PhotoTransformSchema } from "./photos";
it("accepts large canonical-shaped base64 without a recursive-pattern overflow", () => {
  expect(PhotoDataSchema.safeParse("A".repeat(8 * 1024 * 1024)).success).toBe(true);
  for (const value of ["", "AAA", "AA=A", "data:image/png;base64,AAAA", "http://example.test/photo"]) expect(PhotoDataSchema.safeParse(value).success).toBe(false);
});
it("bounds photo dimensions and rejects non-finite transforms", () => {
  expect(PhotoSchema.safeParse({ data: "AAAA", mimeType: "image/svg+xml", width: 1, height: 1 }).success).toBe(false);
  expect(PhotoTransformSchema.safeParse({ operation: "resize", width: 5000, height: 1 }).success).toBe(false);
  expect(PhotoTransformSchema.safeParse({ operation: "crop", x: NaN, y: 0, width: 1, height: 1 }).success).toBe(false);
});
