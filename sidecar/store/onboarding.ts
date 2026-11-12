import { OnboardingStateSchema, OnboardingStepSchema, type OnboardingState } from "../../shared/onboarding";
import type { Ctx } from "./context";
import { inTransaction } from "./migrations";
import { fail, ok, type Result } from "./result";
import { addTask } from "./tasks";

const KEY = "onboarding-v1";

export function onboardingRepository(ctx: Ctx) {
  const get = (): OnboardingState => {
    const row = ctx.db.prepare("SELECT value FROM settings WHERE key = ?").get(KEY);
    try { return OnboardingStateSchema.parse(JSON.parse(String(row?.value))); }
    catch { return { step: 0, taskId: null }; }
  };
  const save = (state: OnboardingState) => {
    ctx.db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(KEY, JSON.stringify(state), ctx.now());
    return ok(state);
  };
  return {
    get,
    move: (input: unknown): Result<OnboardingState> => {
      const step = OnboardingStepSchema.safeParse(input);
      return step.success ? save({ ...get(), step: step.data }) : fail("invalid", "Choose a setup step from 0 to 3.");
    },
    capture: (title: unknown): Result<OnboardingState> => {
      let result: Result<OnboardingState> = ok(get());
      inTransaction(ctx.db, () => {
        const state = get();
        if (state.taskId) { result = save({ ...state, step: 1 }); return; }
        const added = addTask(ctx, { title });
        result = added.ok ? save({ step: 1, taskId: added.value.id }) : added;
      });
      return result;
    },
  };
}
