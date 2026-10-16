import { z } from "zod";
import { SIZES } from "./method";
import { PHASES, PomodoroConfigSchema, PomodoroStateSchema } from "./pomodoro";
import { FOCUS_OUTCOMES } from "./focus";
import { PROVIDER_IDS } from "./providers";

/** Wire contract between the sidecar server and the panel. Both sides validate with these. */

export const ProviderStatusSchema = z.object({
  id: z.enum(PROVIDER_IDS),
  label: z.string(),
  installed: z.boolean(),
  ready: z.boolean(),
  detail: z.string(),
});

export const BrainSettingsSchema = z.object({
  provider: z.enum(PROVIDER_IDS).nullable(),
  model: z.string().nullable(),
});

export const BrainStateSchema = z.object({
  settings: BrainSettingsSchema,
  providers: z.array(ProviderStatusSchema),
});

export const ModelsSchema = z.object({ models: z.array(z.string()) });

export const TestResultSchema = z.object({ detail: z.string() });

export const ConnectionInfoSchema = z.object({
  port: z.number().int().min(1).max(65535),
  token: z.string().min(16),
});

export const ApiErrorSchema = z.object({ code: z.string(), message: z.string() });

/** Expected failures are values (ok: false), not HTTP errors. HTTP errors mean auth or a malformed request. */
export const envelope = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data }),
    z.object({ ok: z.literal(false), error: ApiErrorSchema }),
  ]);

export type ProviderStatusDto = z.output<typeof ProviderStatusSchema>;
export type BrainSettingsDto = z.output<typeof BrainSettingsSchema>;
export type BrainStateDto = z.output<typeof BrainStateSchema>;
export type ConnectionInfo = z.output<typeof ConnectionInfoSchema>;
export type ApiError = z.output<typeof ApiErrorSchema>;
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const TOKEN_HEADER = "x-heel-token";
export const CONNECTION_FILE = "sidecar.json";
/** Bundle identifier. Must equal `identifier` in src-tauri/tauri.conf.json (a test enforces it). */
export const APP_ID = "studio.theft.heel";

/* Today tab */

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "doing", "done", "dropped"]),
  nowStep: z.string().nullable(),
  source: z.enum(["manual", "capture", "inbox"]),
  sourceRef: z.string().nullable(),
  position: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable(),
  size: z.enum(SIZES).nullable(),
  bucket: z.string().nullable(),
  estimateMin: z.number().nullable(),
  parentId: z.string().nullable().default(null),
  /** For a task with steps: how many are finished (the open ones are in the list). */
  stepsDone: z.number().int().optional(),
});
export const TaskPatchSchema = z.object({ size: z.enum(SIZES).nullable(), bucket: z.string().nullable(), estimateMin: z.number().int().positive().nullable() }).partial();
export { MethodNumbersSchema, MethodSchema, type Method, type MethodNumbers } from "./method";
/** Attention sense (N24). Off by default; the wander list is where the rabbit-hole rule may look. */
export const DEFAULT_WANDER_BUNDLES = ["com.apple.Safari", "com.google.Chrome", "company.thebrowser.Browser", "org.mozilla.firefox", "com.apple.MobileSMS", "com.tinyspeck.slackmacgap", "com.hnc.Discord", "com.apple.mail"] as const;
export const AttentionSettingsSchema = z.object({ enabled: z.boolean().default(false), wanderBundles: z.array(z.string().min(1)).max(50).default([...DEFAULT_WANDER_BUNDLES]) });
export type AttentionSettings = z.output<typeof AttentionSettingsSchema>;
export const DEFAULT_ATTENTION_SETTINGS: AttentionSettings = AttentionSettingsSchema.parse({});
export const AttentionDaySchema = z.object({ date: z.string(), apps: z.record(z.string(), z.object({ name: z.string(), seconds: z.number() })) });
export const AttentionViewSchema = z.object({ settings: AttentionSettingsSchema, day: AttentionDaySchema });
export type AttentionViewDto = z.output<typeof AttentionViewSchema>;
export const AttentionSampleSchema = z.object({ bundle: z.string().min(1), name: z.string(), idleSec: z.number().min(0), intervalSec: z.number().positive(), quiet: z.boolean().default(false), at: z.number().optional() });
export const NudgeSchema = z.object({ rule: z.enum(["rabbit-hole", "time-suck", "drifting", "hyperfocus"]), text: z.string(), choices: z.array(z.string()) });
export const NudgeResultSchema = z.object({ nudge: NudgeSchema.nullable() });
export type NudgeDto = z.output<typeof NudgeSchema>;
export const PomodoroViewSchema = z.object({ state: PomodoroStateSchema.nullable(), config: PomodoroConfigSchema, ended: z.enum(PHASES).nullable(), remainingMs: z.number() });
export type PomodoroViewDto = z.output<typeof PomodoroViewSchema>;

export const TasksStateSchema = z.object({ tasks: z.array(TaskSchema), parkedCount: z.number().int(), doneToday: z.number().int() });
/** What was finished: by local day (YYYY-MM-DD), newest first, and the last seven days' counts, oldest first. */
export const HistoryDaySchema = z.object({ date: z.string(), count: z.number().int(), tasks: z.array(TaskSchema) });
export const HistorySchema = z.object({ days: z.array(HistoryDaySchema), week: z.array(z.object({ date: z.string(), count: z.number().int() })) });
export type HistoryDto = z.output<typeof HistorySchema>;
export const TaskResultSchema = z.object({ task: TaskSchema });
export const ParkedResultSchema = z.object({ id: z.string() });
export const TextInputSchema = z.object({ text: z.string() });

export const UndoSchema = z.object({ kind: z.enum(["restore_task", "drop_task", "unpark", "delete_document"]), id: z.string() });

/** A document Heel wrote (N15): the row, with the file's path when one was written. */
export const DocumentSchema = z.object({ id: z.string(), title: z.string(), path: z.string().nullable(), pdfPath: z.string().nullable().default(null), createdAt: z.number() });
export const DOCUMENT_FILES = ["md", "pdf"] as const;
export type DocumentFile = (typeof DOCUMENT_FILES)[number];
export type DocumentDto = z.output<typeof DocumentSchema>;
export const DocumentsListSchema = z.object({ documents: z.array(DocumentSchema) });
export const DocumentResultSchema = z.object({ document: DocumentSchema });
export const OpenedSchema = z.object({ opened: z.boolean() });

/** `mail` is a message id the person can open in Mail from the receipt (N26). */
export const ActionOutcomeSchema = z.object({ type: z.string(), ok: z.boolean(), message: z.string(), undo: UndoSchema.optional(), document: z.string().optional(), file: z.enum(DOCUMENT_FILES).optional(), mail: z.string().optional() });

export const ParkedIdeaSchema = z.object({ id: z.string(), idea: z.string(), createdAt: z.number() });
export const ParkedListSchema = z.object({ parked: z.array(ParkedIdeaSchema) });
export const UnparkResultSchema = z.object({ id: z.string() });

/** Earlier messages the panel replays so the model can follow a conversation. Bounded; the model's own words are plain text. */
export const MAX_HISTORY_MESSAGES = 6;
export const HistoryMessageSchema = z.object({ role: z.enum(["user", "heel"]), text: z.string() });
export const TurnInputSchema = z.object({
  text: z.string(),
  history: z.array(HistoryMessageSchema).max(MAX_HISTORY_MESSAGES).default([]),
});

export const TurnResultSchema = z.object({
  say: z.string(),
  applied: z.array(ActionOutcomeSchema),
  skills: z.array(z.string()),
  provider: z.enum(PROVIDER_IDS),
});

export type UndoDto = z.output<typeof UndoSchema>;
export type ParkedIdeaDto = z.output<typeof ParkedIdeaSchema>;
export type HistoryMessage = z.output<typeof HistoryMessageSchema>;
export type TaskDto = z.output<typeof TaskSchema>;
export type TasksStateDto = z.output<typeof TasksStateSchema>;
export type TurnResultDto = z.output<typeof TurnResultSchema>;
export type ActionOutcomeDto = z.output<typeof ActionOutcomeSchema>;

/* Focus time-boxes and the interrupt budget */

export const FocusSchema = z.object({
  id: z.string(),
  goal: z.string(),
  taskId: z.string().nullable(),
  bestMin: z.number().int(),
  realisticMin: z.number().int(),
  worstMin: z.number().int(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  outcome: z.enum(FOCUS_OUTCOMES).nullable(),
});
export const FocusStateSchema = z.object({ focus: FocusSchema.nullable() });
export const StartFocusInputSchema = z.object({
  goal: z.string(),
  taskId: z.string().nullable().default(null),
  realisticMin: z.number().int(),
});
export const EndFocusInputSchema = z.object({ outcome: z.enum(FOCUS_OUTCOMES) });
export const InterruptStateSchema = z.object({ limit: z.number().int(), used: z.number().int(), remaining: z.number().int() });
export const SpendInputSchema = z.object({ reason: z.string() });
export const SpendResultSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number().int(),
  why: z.enum(["spent", "already", "budget"]),
});

export type FocusDto = z.output<typeof FocusSchema>;
export type InterruptStateDto = z.output<typeof InterruptStateSchema>;
export type SpendResultDto = z.output<typeof SpendResultSchema>;

/* Conversation history (survives a restart) */

export const ReceiptSchema = z.object({ ok: z.boolean(), text: z.string(), undo: UndoSchema.nullable(), undone: z.boolean(), document: z.string().optional(), file: z.enum(DOCUMENT_FILES).optional(), mail: z.string().optional() });

/** A message the panel keeps. A turn still waiting for the AI ("pending") is never stored. */
export const StoredMessageSchema = z.discriminatedUnion("role", [
  z.object({ id: z.number().int(), role: z.literal("user"), text: z.string(), label: z.string().optional() }),
  z.discriminatedUnion("status", [
    z.object({ id: z.number().int(), role: z.literal("heel"), status: z.literal("said"), say: z.string(), receipts: z.array(ReceiptSchema), skills: z.array(z.string()).optional() }),
    z.object({
      id: z.number().int(),
      role: z.literal("heel"),
      status: z.literal("failed"),
      message: z.string(),
      offerSettings: z.boolean(),
      retryText: z.string(),
    }),
  ]),
]);
export const MessagesStateSchema = z.object({ messages: z.array(StoredMessageSchema), nextId: z.number().int() });
export const SaveMessageInputSchema = z.object({ message: StoredMessageSchema });
export const ClearedSchema = z.object({ clearedAt: z.number().nullable(), count: z.number().int() });
export const RestoreInputSchema = z.object({ clearedAt: z.number() });

export type StoredMessage = z.output<typeof StoredMessageSchema>;
export type ReceiptDto = z.output<typeof ReceiptSchema>;

/* Inbox digest (Gmail, read-only) */

export const InboxStatusSchema = z.object({
  /** A Google client ID and secret have been saved. */
  configured: z.boolean(),
  connected: z.boolean(),
  account: z.string().nullable(),
  /** Why the last Connect did not finish, in a sentence; null when nothing is wrong. */
  problem: z.string().nullable(),
});
export const SetGmailClientInputSchema = z.object({ clientId: z.string(), clientSecret: z.string() });
export const InboxConnectSchema = z.object({ url: z.string() });
export const DigestItemSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  subject: z.string(),
  /** One literal line: "they ask you to X by Y". */
  summary: z.string(),
  /** What to add as a task, in the person's voice. */
  taskTitle: z.string(),
});
export const DigestSchema = z.object({
  items: z.array(DigestItemSchema),
  /** How many unread or starred emails were looked at. */
  considered: z.number().int(),
  /** Exactly what was sent to the AI, so nothing leaves unseen. */
  sentToModel: z.string(),
  checkedAt: z.number(),
});
export const AddInboxTaskInputSchema = z.object({ messageId: z.string(), title: z.string() });

/* Mail on this Mac (Apple Mail through Automation): read, open, reply with a preview first */

export const MailStatusSchema = z.object({
  /** Apple Mail is on this Mac. The first real use asks macOS to allow Heel to talk to Mail (one prompt). */
  available: z.boolean(),
});
export const OpenMailInputSchema = z.object({ messageId: z.string().min(1) });
export const DraftReplyInputSchema = z.object({
  messageId: z.string().min(1),
  from: z.string(),
  subject: z.string(),
  summary: z.string(),
  /** What the person wants to say, in their words. */
  instruction: z.string().min(1).max(2000),
});
export const DraftReplySchema = z.object({ draft: z.string(), sentToModel: z.string() });
/** The exact text to send. Only the preview's Send button calls the send route; the open route leaves it in Mail unsent. */
export const SendReplyInputSchema = z.object({ messageId: z.string().min(1), body: z.string().min(1).max(20_000) });
export const SendReplySchema = z.object({ sent: z.boolean() });

export type MailStatusDto = z.output<typeof MailStatusSchema>;
export type DraftReplyDto = z.output<typeof DraftReplySchema>;

export type InboxStatusDto = z.output<typeof InboxStatusSchema>;
export type DigestItemDto = z.output<typeof DigestItemSchema>;
export type DigestDto = z.output<typeof DigestSchema>;

/* Quick add (no AI) */

export const AddTaskInputSchema = z.object({ title: z.string(), nowStep: z.string().nullable().optional() });

/** Search (N22): one box over open tasks, parked ideas, what was finished and what was said; ranked, newest first within a rank. */
export const SEARCH_KINDS = ["task", "parked", "done", "said", "document"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];
export const SearchHitSchema = z.object({ kind: z.enum(SEARCH_KINDS), id: z.string(), text: z.string(), detail: z.string().nullable(), at: z.number() });
export const SearchResultSchema = z.object({ query: z.string(), hits: z.array(SearchHitSchema) });
export type SearchHitDto = z.output<typeof SearchHitSchema>;
export type SearchResultDto = z.output<typeof SearchResultSchema>;

/** Splitting a task (N23): Heel proposes steps, nothing is written until the person says "Add these". */
export const SPLIT_MAX_STEPS = 7;
export const SPLIT_MIN_STEPS = 2;
export const SplitProposalSchema = z.object({ steps: z.array(z.string().trim().min(1).max(500)).min(SPLIT_MIN_STEPS).max(SPLIT_MAX_STEPS) });
export type SplitProposalDto = z.output<typeof SplitProposalSchema>;
export const SplitInputSchema = z.object({ titles: z.array(z.string().trim().min(1).max(500)).min(1).max(SPLIT_MAX_STEPS) });
export const SplitResultSchema = z.object({ parent: TaskSchema, children: z.array(TaskSchema) });
export type SplitResultDto = z.output<typeof SplitResultSchema>;
export const UnsplitResultSchema = z.object({ count: z.number().int() });
export * from "./skills";
