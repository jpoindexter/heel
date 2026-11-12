import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type AnimationEvent, type ReactNode } from "react";
import { atRoot, back as backOf, baseState, focusAfterLeave, forward as forwardOf, home as homeOf, isOpen, openerOf, push as pushOf, ROOT, SIDES, topOf, underOf, type Layer, type Opener, type Stack } from "./layers-model";
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
  /** What had focus when each layer was pushed, so Back can give it back. */
  openers: React.RefObject<Map<Layer, Opener>>;
};

const LayersContext = createContext<Layers | null>(null);

/** One stack for the whole panel: what is open, what is leaving, and the four moves. */
export function LayersProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Stack>(ROOT);
  const [leaving, setLeaving] = useState<Layer | null>(null);
  const pending = useRef<"back" | "home" | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const openers = useRef(new Map<Layer, Opener>());

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
      if (atRoot(stack) || pending.current) return;
      const top = topOf(stack);
      pending.current = move;
      setLeaving(top);
      timer.current = window.setTimeout(() => settle(top), LEAVE_FALLBACK_MS);
    },
    [stack, settle],
  );

  const push = useCallback((layer: Layer) => {
    openers.current.set(layer, openerOf(document.activeElement));
    const move = pending.current;
    pending.current = null;
    window.clearTimeout(timer.current);
    setLeaving(null);
    setStack((current) => pushOf(move === "home" ? homeOf(current) : move === "back" ? backOf(current) : current, layer));
  }, []);
  const forward = useCallback(() => setStack((current) => forwardOf(current)), []);
  const back = useCallback(() => leave("back"), [leave]);
  const home = useCallback(() => leave("home"), [leave]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo<Layers>(
    () => ({ stack, top: topOf(stack), under: underOf(stack), leaving, push, back, forward, home, settle, openers }),
    [stack, leaving, push, back, forward, home, settle],
  );
  return <LayersContext.Provider value={value}>{children}</LayersContext.Provider>;
}

export function useLayers(): Layers {
  const layers = useContext(LayersContext);
  if (!layers) throw new Error("useLayers needs a <LayersProvider> above it (the panel renders one).");
  return layers;
}

/** The base and the layers over it. The base is pushed back or dimmed by what is open and takes no pointer, and no keyboard, then. */
export function LayerHost({ base, children }: { base: ReactNode; children: ReactNode }) {
  const { stack } = useLayers();
  const state = baseState(stack);
  return (
    <div className="layer-host">
      <div className="layer-base" data-state={state} inert={state !== "flat"} tabIndex={-1}>{base}</div>
      {children}
    </div>
  );
}

/**
 * Keyboard focus follows the layers: a layer that becomes the top takes focus (unless something inside already has it,
 * like the search box); when it leaves, focus goes back to the control that opened it, or to the layer underneath.
 */
function useLayerFocus(name: Layer, isTop: boolean, section: React.RefObject<HTMLElement | null>) {
  const { openers } = useLayers();
  useEffect(() => {
    if (!isTop) return;
    const frame = requestAnimationFrame(() => {
      const el = section.current;
      if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [isTop, section]);
  useEffect(() => {
    const el = section.current; // kept in the closure: React nulls the ref itself before the cleanup runs
    return () => {
      // StrictMode runs this once right after mount with the layer still on screen: that is not a leave.
      if (el?.isConnected) return;
      const opener = openers.current?.get(name) ?? null;
      openers.current?.delete(name);
      requestAnimationFrame(() => {
        // The header re-makes its buttons when a layer opens, so the node may be gone: its name finds the new one.
        const tag = opener?.node?.tagName.toLowerCase() ?? "button";
        const node = opener?.node?.isConnected ? opener.node : opener?.label ? document.querySelector(`${tag}[aria-label="${opener.label}"]`) : null;
        const target = focusAfterLeave(node ? { connected: node.isConnected, covered: node.closest("[inert]") !== null } : null);
        const fallback = document.querySelector<HTMLElement>(".layer:not([data-leaving]):last-of-type") ?? document.querySelector<HTMLElement>(".layer-base");
        (target === "opener" && node instanceof HTMLElement ? node : fallback)?.focus({ preventScroll: true });
      });
    };
  }, [name, openers, section]);
}

/** One surface. Drawn while open or leaving; it arrives from its side and leaves the same way (a cross-fade under Reduce Motion). */
export function Layer({ name, label, fill = false, children }: { name: Layer; label: string; /** Take the whole room under the header (the conversation needs it), still arriving from its side. */ fill?: boolean; children: ReactNode }) {
  const { stack, leaving, settle } = useLayers();
  const shown = isOpen(stack, name) || leaving === name;
  return shown ? <OpenLayer name={name} label={label} fill={fill} isTop={topOf(stack) === name && leaving !== name} leaving={leaving === name} settle={settle}>{children}</OpenLayer> : null;
}

type OpenProps = { name: Layer; label: string; fill: boolean; isTop: boolean; leaving: boolean; settle: (layer: Layer) => void; children: ReactNode };

/** A layer that is on screen: covered layers are inert (no pointer, no Tab), the top one owns focus. */
function OpenLayer({ name, label, fill, isTop, leaving, settle, children }: OpenProps) {
  const section = useRef<HTMLElement>(null);
  useLayerFocus(name, isTop, section);
  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && leaving) settle(name);
  };
  return (
    <section ref={section} tabIndex={-1} className="layer" role="region" aria-label={label} data-side={SIDES[name]} data-fill={fill || undefined} data-leaving={leaving || undefined} inert={!isTop} onAnimationEnd={onAnimationEnd}>
      <div className="layer-scroll">{children}</div>
    </section>
  );
}
