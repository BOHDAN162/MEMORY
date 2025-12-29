"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS } from "@/lib/config/tour";

const STORAGE_KEY = "memory.tour.v0.completed";
const HIGHLIGHT_PADDING = 8;

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const TourOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isTargetMissing, setIsTargetMissing] = useState(false);

  const currentStep = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  const finishTour = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch (error) {
      console.error("Failed to persist tour completion", error);
    }

    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let shouldOpen = true;

    try {
      const completed = window.localStorage.getItem(STORAGE_KEY);
      shouldOpen = completed !== "1";
    } catch (error) {
      console.error("Failed to read tour completion flag", error);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync tour visibility with persisted flag
    setIsOpen(shouldOpen);
  }, []);

  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const updateTarget = () => {
      if (typeof document === "undefined") return;

      try {
        const element = document.querySelector(currentStep.selector);

        if (element instanceof HTMLElement) {
          const rect = element.getBoundingClientRect();
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
          setIsTargetMissing(false);
        } else {
          setTargetRect(null);
          setIsTargetMissing(true);
        }
      } catch (error) {
        console.error("Failed to find tour target", error);
        setTargetRect(null);
        setIsTargetMissing(true);
      }
    };

    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);

    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [isOpen, currentStep]);

  const tooltipPosition = useMemo(() => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" } as const;
    }

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
    const estimatedHeight = 220;

    const preferredTop = targetRect.top + targetRect.height + 16;
    let top = preferredTop;

    if (viewportHeight && preferredTop + estimatedHeight > viewportHeight - 16) {
      top = Math.max(targetRect.top - estimatedHeight - 16, 16);
    }

    const centerLeft = targetRect.left + targetRect.width / 2;
    const maxLeft = viewportWidth ? viewportWidth - 16 : centerLeft;
    const left = viewportWidth ? clamp(centerLeft, 16, maxLeft) : centerLeft;

    return { top, left, transform: "translate(-50%, 0)" } as const;
  }, [targetRect]);

  if (!isOpen || !currentStep) return null;

  const highlightStyle = targetRect
    ? {
        top: Math.max(targetRect.top - HIGHLIGHT_PADDING, 8),
        left: Math.max(targetRect.left - HIGHLIGHT_PADDING, 8),
        width: targetRect.width + HIGHLIGHT_PADDING * 2,
        height: targetRect.height + HIGHLIGHT_PADDING * 2,
      }
    : undefined;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="pointer-events-none absolute inset-0 bg-background/60 backdrop-blur-[2px]" aria-hidden />
      {highlightStyle ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-[top,left,width,height] duration-200"
          style={highlightStyle}
        />
      ) : null}
      <div
        className="pointer-events-auto absolute z-10 max-w-sm rounded-xl border border-primary/30 bg-card p-4 shadow-xl shadow-black/20"
        style={tooltipPosition}
        role="dialog"
        aria-live="polite"
        aria-label={`Tour step ${stepIndex + 1}`}
      >
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-primary">
          <span>Шаг {stepIndex + 1}/{TOUR_STEPS.length}</span>
          {isTargetMissing ? (
            <span className="text-[11px] text-muted-foreground">Элемент вне видимой области</span>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold leading-tight">{currentStep.title}</p>
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={finishTour}>
            Пропустить
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="soft"
              size="sm"
              onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={stepIndex === 0}
            >
              Назад
            </Button>
            {isLastStep ? (
              <Button size="sm" onClick={finishTour}>
                Готово
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStepIndex((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1))}
              >
                Далее
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourOverlay;
