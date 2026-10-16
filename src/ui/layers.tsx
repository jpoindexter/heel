import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type AnimationEvent, type ReactNode } from "react";
import { atRoot, back as backOf, baseState, forward as forwardOf, home as homeOf, isOpen, push as pushOf, ROOT, SIDES, topOf, underOf, type Layer, type Stack } from "./layers-model";
import "./layers.css";

/** If a leaving layer's exit animation never reports its end, it still goes. */
const LEAVE_FALLBACK_MS = 400;

export type Layers = {
  stack: Stack;
  top: Layer;
  under: Layer;
  /** The layer on its way out (still drawn until its animation ends). */
  leaving: Layer | null;
  push: (layer: Layer) => void;
  back: () => void;
  forward: () => void;
  home: () => void;
  settle: (layer: Layer) => void;
};

const LayersContext = createContext<Layers | null>(null);

/** One stack for the whole panel: what is open, what is leaving, and the four moves. */
export function LayersProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Stack>(ROOT);
  const [leaving, setLeaving] = useState<Layer | null>(null);
  const pending = useRef<"back" | "home" | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const settle = useCallback((layer: Layer) => {
    if (pending.current === null) return;
    window.clearTimeout(timer.current);
    const move = pending.current;
    pending.current = null;
    setLeaving((current) => (current === layer ? null : current));
    setStack((current) => (move === "home" ? homeOf(current) : backOf(current)));
  }, []);

  const leave = useCallback(
    (move: "back" | "home") => {
      setStack((current) => {
        if (atRoot(current) || pending.current) return current;
        const top = topOf(current);
        pending.current = move;
        setLeaving(top);
        timer.current = window.setTimeout(() => settle(top), LEAVE_FALLBACK_MS);
        return current;
      });
    },
    [settle],
  );

  const push = useCallback((layer: Layer) => setStack((current) => pushOf(current, layer)), []);
  const forward = useCallback(() => setStack((current) => forwardOf(current)), []);
  const back = useCallback(() => leave("back"), [leave]);
  const home = useCallback(() => leave("home"), [leave]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo<Layers>(
    () => ({ stack, top: topOf(stack), under: underOf(stack), leaving, push, back, forward, home, settle }),
    [stack, leaving, push, back, forward, home, settle],
  );
  return <LayersContext.Provider value={value}>{children}</LayersContext.Provider>;
}

export function useLayers(): Layers {
  const layers = useContext(LayersContext);
  if (!layers) throw new Error("useLayers needs a <LayersProvider> above it (the panel renders one).");
  return layers;
}

/** The base and the layers over it. The base is pushed back or dimmed by what is open and takes no pointer then. */
export function LayerHost({ base, children }: { base: ReactNode; children: ReactNode }) {
  const { stack } = useLayers();
  return (
    <div className="layer-host">
      <div className="layer-base" data-state={baseState(stack)}>{base}</div>
      {children}
    </div>
  );
}

/** One surface. Drawn while open or leaving; it arrives from its side and leaves the same way (a cross-fade under Reduce Motion). */
export function Layer({ name, label, fill = false, children }: { name: Layer; label: string; /** Take the whole room under the header (the conversation needs it), still arriving from its side. */ fill?: boolean; children: ReactNode }) {
  const { stack, leaving, settle } = useLayers();
  if (!isOpen(stack, name) && leaving !== name) return null;
  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && leaving === name) settle(name);
  };
  return (
    <section className="layer" role="region" aria-label={label} data-side={SIDES[name]} data-fill={fill || undefined} data-leaving={leaving === name || undefined} onAnimationEnd={onAnimationEnd}>
      <div className="layer-scroll">{children}</div>
    </section>
  );
}
