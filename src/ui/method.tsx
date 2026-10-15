import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MethodSchema, type Method } from "../../shared/method";
import { DEFAULT_METHOD } from "../../shared/method";
import type { Client } from "../api/client";

export type MethodState = {
  method: Method;
  /** Save a change; the helper owns it, so it survives a restart. Returns the sentence to show when it refuses. */
  change: (next: Method) => Promise<string | null>;
};

const MethodContext = createContext<MethodState | null>(null);

/** The chosen ways of working, read once from the helper and kept for the whole panel (the list and Settings both follow it). */
export function MethodProvider({ client, children }: { client: Client; children: ReactNode }) {
  const [method, setMethod] = useState<Method>(DEFAULT_METHOD);

  useEffect(() => {
    void client.get("/method", MethodSchema).then((result) => result.ok && setMethod(result.data));
  }, [client]);

  const change = useCallback(
    async (next: Method): Promise<string | null> => {
      const result = await client.put("/method", MethodSchema, next);
      if (!result.ok) return result.error.message;
      setMethod(result.data);
      return null;
    },
    [client],
  );

  const value = useMemo<MethodState>(() => ({ method, change }), [method, change]);
  return <MethodContext.Provider value={value}>{children}</MethodContext.Provider>;
}

/** One sentence per picker for Settings: what the panel does differently. */
export function whatChanges(method: Method): string {
  const parts: string[] = [];
  parts.push(method.timer === "pomodoro" ? "The clock on Now runs 25/5 cycles." : "The clock on Now is a single time-box.");
  if (method.structure === "pickle-jar") parts.push("The list shows Rocks, Pebbles and Sand; a tap on a task's bucket moves it.");
  else if (method.structure !== "none") parts.push(`The list is grouped by ${method.structure}.`);
  else parts.push("The list is one plain list.");
  if (method.sizing === "tshirt") parts.push("Every task gets XS–XL; a tap cycles it.");
  return parts.join(" ");
}

export function useMethod(): MethodState {
  const state = useContext(MethodContext);
  if (!state) throw new Error("useMethod needs a <MethodProvider> above it (the panel renders one).");
  return state;
}
