import { useEffect, useRef } from "react";

export type KeymapHandlers = {
  onSpotlight?: () => void;
  onGoAtlas?: () => void;
  onGoFocus?: () => void;
  onGoReview?: () => void;
  onGoMomentum?: () => void;
  onGoOutline?: () => void;
  onGoExport?: () => void;
  onClose?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
};

function isTyping(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

export function useGlobalKeymap(handlers: KeymapHandlers) {
  const gRef = useRef(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        h.onSpotlight?.();
        gRef.current = false;
        return;
      }
      if (e.key === "Escape") {
        h.onClose?.();
        gRef.current = false;
        return;
      }
      if (e.key === "j" && !isTyping(e.target)) { h.onNext?.(); return; }
      if (e.key === "k" && !isTyping(e.target)) { h.onPrev?.(); return; }
      if (e.key === "?" && !isTyping(e.target)) {
        e.preventDefault();
        h.onSpotlight?.();
        return;
      }
      if (e.key === "g" && !isTyping(e.target)) {
        gRef.current = true;
        setTimeout(() => { gRef.current = false; }, 1000);
        return;
      }
      if (gRef.current && !isTyping(e.target)) {
        gRef.current = false;
        switch (e.key) {
          case "a": h.onGoAtlas?.(); break;
          case "f": h.onGoFocus?.(); break;
          case "r": h.onGoReview?.(); break;
          case "m": h.onGoMomentum?.(); break;
          case "o": h.onGoOutline?.(); break;
          case "x": h.onGoExport?.(); break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
