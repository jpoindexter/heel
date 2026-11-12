import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { OnboardingStateSchema, type OnboardingState } from "../../shared/onboarding";
import { client } from "../api/default-client";

function useSetup() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const lock = useRef(false), generation = useRef(0);
  const refresh = useCallback(async () => {
    if (lock.current) return;
    const current = ++generation.current;
    const response = await client.get("/onboarding", OnboardingStateSchema);
    if (response.ok && current === generation.current) setState(response.data);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const save = async (method: "post" | "put", path: string, body: unknown) => {
    if (lock.current) return false;
    lock.current = true; generation.current++; setBusy(true); setProblem(null);
    try {
      const response = await client[method](path, OnboardingStateSchema, body);
      if (!response.ok) { setProblem(response.error.message); return false; }
      setState(response.data); return true;
    } finally { lock.current = false; setBusy(false); }
  };
  return { state, busy, problem, refresh, move: (step: number) => save("put", "/onboarding", { step }), capture: (title: string) => save("post", "/onboarding/task", { title }) };
}

export type Onboarding = ReturnType<typeof useSetup>;
const Context = createContext<Onboarding | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const setup = useSetup();
  return <Context.Provider value={setup}>{children}</Context.Provider>;
}

export function useOnboarding() {
  const setup = useContext(Context);
  if (!setup) throw new Error("Onboarding needs its provider.");
  return setup;
}
