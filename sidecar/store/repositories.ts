import type { Ctx } from "./context";
import { activeFocus, endFocus, startFocus } from "./focus";
import { interruptState, spendInterrupt } from "./interrupts";
import { doneToday, history } from "./history";
import { getLedger, upsertLedger } from "./ledger";
import { clearMessages, listMessages, restoreMessages, saveMessage } from "./messages";
import { listParked, parkIdea, promoteParked, unparkIdea } from "./parked";
import { foldAttention, getAttentionDay, getAttentionSettings, setAttentionSettings } from "./attention";
import { movePomodoro, readPomodoro, setPomodoroConfig, startCycle } from "./pomodoro";
import type { FocusOutcome, TaskStatus } from "./schema";
import { search } from "./search";
import { childrenOf, doneStepCounts, splitTask, unsplitTask } from "./split";
import { getBrain, getMethod, getMethodNumbers, setBrain, setMethod, setMethodNumbers } from "./settings";
import { addTask, completeTask, dropTask, getTask, listTasks, patchTask, restoreTask, setNowStep, startTask } from "./tasks";

/** Steps under a task (N23). */
function splitRepository(ctx: Ctx) {
  return {
    apply: (parentId: string, input: unknown) => splitTask(ctx, parentId, input),
    undo: (parentId: string) => unsplitTask(ctx, parentId),
    children: (parentId: string) => childrenOf(ctx, parentId),
    doneCounts: () => doneStepCounts(ctx),
  };
}

/** The Today side of the store: tasks, parked ideas, focus time-boxes and the working-memory ledger. */
export function todayRepositories(ctx: Ctx) {
  return {
    tasks: {
      add: (input: unknown) => addTask(ctx, input),
      get: (id: string) => getTask(ctx, id),
      list: (statuses?: readonly TaskStatus[]) => listTasks(ctx, statuses),
      start: (id: string) => startTask(ctx, id),
      complete: (id: string) => completeTask(ctx, id),
      drop: (id: string) => dropTask(ctx, id),
      restore: (id: string) => restoreTask(ctx, id),
      setNowStep: (id: string, step: string | null) => setNowStep(ctx, id, step),
      patch: (id: string, input: unknown) => patchTask(ctx, id, input),
    },
    parked: {
      park: (input: unknown) => parkIdea(ctx, input),
      list: (includePromoted?: boolean) => listParked(ctx, includePromoted),
      promote: (id: string) => promoteParked(ctx, id),
      unpark: (id: string) => unparkIdea(ctx, id),
    },
    focus: {
      start: (input: unknown) => startFocus(ctx, input),
      end: (id: string, outcome: FocusOutcome) => endFocus(ctx, id, outcome),
      active: () => activeFocus(ctx),
    },
    ledger: {
      get: (taskId: string | null) => getLedger(ctx, taskId),
      upsert: (taskId: string | null, patch: unknown) => upsertLedger(ctx, taskId, patch),
    },
    history: {
      list: (days: number) => history(ctx, days),
      doneToday: () => doneToday(ctx),
    },
    pomodoro: {
      read: () => readPomodoro(ctx),
      start: (goal: string, taskId: string | null) => startCycle(ctx, goal, taskId),
      move: (move: "pause" | "resume" | "skip" | "next" | "stop") => movePomodoro(ctx, move),
      setConfig: (input: unknown) => setPomodoroConfig(ctx, input),
    },
    attention: {
      day: () => getAttentionDay(ctx),
      fold: (sample: Parameters<typeof foldAttention>[1], context: Parameters<typeof foldAttention>[2]) => foldAttention(ctx, sample, context),
    },
    split: splitRepository(ctx),
    search: (query: string) => search(ctx, query),
    now: ctx.now,
  };
}

/** What keeps Heel itself running: the interrupt budget, the kept conversation and settings. */
export function systemRepositories(ctx: Ctx) {
  return {
    interrupts: {
      state: () => interruptState(ctx),
      spend: (reason: unknown) => spendInterrupt(ctx, reason),
    },
    messages: {
      list: () => listMessages(ctx),
      save: (input: unknown) => saveMessage(ctx, input),
      clear: () => clearMessages(ctx),
      restore: (clearedAt: number) => restoreMessages(ctx, clearedAt),
    },
    settings: {
      getBrain: () => getBrain(ctx),
      setBrain: (input: unknown) => setBrain(ctx, input),
      getMethod: () => getMethod(ctx),
      setMethod: (input: unknown) => setMethod(ctx, input),
      getMethodNumbers: () => getMethodNumbers(ctx),
      setMethodNumbers: (input: unknown) => setMethodNumbers(ctx, input),
      getAttention: () => getAttentionSettings(ctx),
      setAttention: (input: unknown) => setAttentionSettings(ctx, input),
    },
  };
}
