import { z } from "zod";

/** Skills (N3): plain instructions the agent reads. Bundled ones can be turned off; yours can also be edited and deleted. */
export const SKILL_FILE_MAX_CHARS = 8_000;
export const SkillInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(["bundled", "yours"]),
  description: z.string(),
  triggers: z.array(z.string()),
  enabled: z.boolean(),
  /** The router always runs: it can be read, never switched off. */
  locked: z.boolean(),
  chars: z.number().int(),
});
export type SkillInfoDto = z.output<typeof SkillInfoSchema>;
export const SkillsListSchema = z.object({ skills: z.array(SkillInfoSchema) });
export const SkillTextSchema = z.object({ id: z.string(), text: z.string(), editable: z.boolean() });
export const SkillResultSchema = z.object({ skill: SkillInfoSchema });
export const SkillInputSchema = z.object({ text: z.string().max(SKILL_FILE_MAX_CHARS * 2) });
export const SkillEnabledInputSchema = z.object({ enabled: z.boolean() });
