import { z } from "zod";

export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export const PhotoDataSchema = z.string().min(4).max(Math.ceil(MAX_PHOTO_BYTES / 3) * 4).regex(/^[A-Za-z0-9+/]*={0,2}$/).refine(value => value.length % 4 === 0);
export const PhotoSchema = z.object({ data: PhotoDataSchema, mimeType: z.literal("image/png"), width: z.number().int().min(1).max(4096), height: z.number().int().min(1).max(4096) });
export const PhotoImportSchema = z.object({ data: PhotoDataSchema });
export const PhotoImportResultSchema = PhotoSchema.extend({ sourceWidth: z.number(), sourceHeight: z.number() });
const Dimension = z.number().int().min(1).max(4096);
export const PhotoTransformSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("rotate"), angle: z.union([z.literal(90), z.literal(-90), z.literal(180)]) }),
  z.object({ operation: z.literal("resize"), width: Dimension, height: Dimension }),
  z.object({ operation: z.literal("crop"), x: z.number().int().min(0), y: z.number().int().min(0), width: Dimension, height: Dimension }),
  z.object({ operation: z.literal("remove-background") }),
]);
export const PhotoTransformInputSchema = z.object({ photo: PhotoSchema, transform: PhotoTransformSchema });
export const PhotoAskSchema = z.object({ photo: PhotoSchema, prompt: z.string().trim().min(1).max(4000) });
export const PhotoEditSchema = PhotoAskSchema.extend({ transparent: z.boolean().default(false) });
export const PhotoAnswerSchema = z.object({ answer: z.string() });
export const PhotoSavedSchema = z.object({ path: z.string(), revealed: z.boolean() });
export type Photo = z.infer<typeof PhotoSchema>;
export type PhotoTransform = z.infer<typeof PhotoTransformSchema>;
export type PhotoEdit = z.infer<typeof PhotoEditSchema>;
export type ImportedPhoto = z.infer<typeof PhotoImportResultSchema>;
