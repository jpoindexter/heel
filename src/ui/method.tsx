import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_METHOD, DEFAULT_METHOD_NUMBERS, MethodNumbersSchema, MethodSchema, type Method, type MethodNumbers, type Structure } from "../../shared/method";
import type { Client } from "../api/client";

export type MethodState = {
  method: Method;
  /** Save a change; the helper owns it, so it survives a restart. Returns the sentence to show when it refuses. */
  change: (next: Method) => Promise<string | null>;
  /** The jar's size and the minutes behind the sizes. */
  numbers: MethodNumbers;
  changeNumbers: (next: MethodNumbers) => Promise<string | null>;
};

const MethodContext = createContext<MethodState | null>(null);

/** The chosen ways of working, read once from the helper and kept for the whole panel (the list and Settings both follow it). */
export function MethodProvider({ client, children }: { client: Client; children: ReactNode }) {
  const [method, setMethod] = useState<Method>(DEFAULT_METHOD);
  const [numbers, setNumbers] = useState<MethodNumbers>(DEFAULT_METHOD_NUMBERS);

  useEffect(() => {
    void client.get("/method", MethodSchema).then((result) => result.ok && setMethod(result.data));
    void client.get("/method/numbers", MethodNumbersSchema).then((result) => result.ok && setNumbers(result.data));
  }, [client]);

  const changeNumbers = useCallback(
    async (next: MethodNumbers): Promise<string | null> => {
      const result = await client.put("/method/numbers", MethodNumbersSchema, next);
      if (!result.ok) return result.error.message;
      setNumbers(result.data);
      return null;
    },
    [client],
  );

  const change = useCallback(
    async (next: Method): Promise<string | null> => {
      const result = await client.put("/method", MethodSchema, next);
      if (!result.ok) return result.error.message;
      setMethod(result.data);
      return null;
    },
    [client],
  );

  const value = useMemo<MethodState>(() => ({ method, change, numbers, changeNumbers }), [method, change, numbers, changeNumbers]);
  return <MethodContext.Provider value={value}>{children}</MethodContext.Provider>;
}

const STRUCTURE_SENTENCES: Readonly<Record<Structure, string>> = {
  none: "The list is one plain list.",
  "pickle-jar": "The list shows Rocks, Pebbles and Sand; a tap on a task's bucket moves it.",
  "one-three-five": "The list shows Big, Medium and Small with their slots; one more than a slot holds asks to park one.",
  eisenhower: "The list shows Do, Schedule and Delegate; a tap to Drop takes the task off the list, with Undo.",
  frog: "One task is the frog, the hardest one: it sits first and is Now. Marking another moves the frog to the rest.",
};

/** One sentence per picker for Settings: what the panel does differently. */
export function whatChanges(method: Method): string {
  const parts: string[] = [];
  parts.push(method.timer === "pomodoro" ? "The clock on Now runs 25/5 cycles." : "The clock on Now is a single time-box.");
  parts.push(STRUCTURE_SENTENCES[method.structure]);
  if (method.sizing === "tshirt") parts.push("Every task gets XS–XL; a tap cycles it.");
  return parts.join(" ");
}

export function useMethod(): MethodState {
  const state = useContext(MethodContext);
  if (!state) throw new Error("useMethod needs a <MethodProvider> above it (the panel renders one).");
  return state;
}
