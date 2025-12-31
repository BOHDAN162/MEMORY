"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS } from "@/lib/config/tour";

const STORAGE_KEY = "memory.tour.v0.completed";
const HIGHLIGHT_PADDING = 8;
const TOOLTIP_VIEWPORT_PADDING = 12;

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
  const [isMounted] = useState(() => typeof window !== "undefined");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

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

  const updateTooltipPosition = useCallback(() => {
    if (!isOpen || !tooltipRef.current) return;

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    if (!viewportWidth || !viewportHeight) return;

    const placement = currentStep?.placement ?? "bottom";
    const defaultTop = (viewportHeight - tooltipRect.height) / 2;
    const defaultLeft = (viewportWidth - tooltipRect.width) / 2;

    if (!targetRect) {
      setTooltipPosition({
        top: clamp(defaultTop, TOOLTIP_VIEWPORT_PADDING, viewportHeight - tooltipRect.height - TOOLTIP_VIEWPORT_PADDING),
        left: clamp(defaultLeft, TOOLTIP_VIEWPORT_PADDING, viewportWidth - tooltipRect.width - TOOLTIP_VIEWPORT_PADDING),
      });
      return;
    }

    let top = targetRect.top + targetRect.height + TOOLTIP_VIEWPORT_PADDING;
    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;

    if (placement === "top") {
      top = targetRect.top - tooltipRect.height - TOOLTIP_VIEWPORT_PADDING;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    } else if (placement === "left") {
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      left = targetRect.left - tooltipRect.width - TOOLTIP_VIEWPORT_PADDING;
    } else if (placement === "right") {
      top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
      left = targetRect.left + targetRect.width + TOOLTIP_VIEWPORT_PADDING;
    }

    setTooltipPosition({
      top: clamp(top, TOOLTIP_VIEWPORT_PADDING, viewportHeight - tooltipRect.height - TOOLTIP_VIEWPORT_PADDING),
      left: clamp(left, TOOLTIP_VIEWPORT_PADDING, viewportWidth - tooltipRect.width - TOOLTIP_VIEWPORT_PADDING),
    });
  }, [currentStep?.placement, isOpen, targetRect]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(updateTooltipPosition);
    return () => cancelAnimationFrame(frame);
  }, [isOpen, stepIndex, targetRect, updateTooltipPosition]);

  useEffect(() => {
    if (!isOpen || !tooltipRef.current) return;

    const observer = new ResizeObserver(() => updateTooltipPosition());
    observer.observe(tooltipRef.current);

    return () => observer.disconnect();
  }, [isOpen, updateTooltipPosition]);

  const tooltipStyle = useMemo(() => {
    if (tooltipPosition) {
      return {
        top: tooltipPosition.top,
        left: tooltipPosition.left,
      } as const;
    }

    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" } as const;
  }, [tooltipPosition]);

  if (!isOpen || !currentStep) return null;

  const highlightStyle = targetRect
    ? {
        top: Math.max(targetRect.top - HIGHLIGHT_PADDING, 8),
        left: Math.max(targetRect.left - HIGHLIGHT_PADDING, 8),
        width: targetRect.width + HIGHLIGHT_PADDING * 2,
        height: targetRect.height + HIGHLIGHT_PADDING * 2,
      }
    : undefined;

  if (!isMounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50">
      <div className="pointer-events-none absolute inset-0 bg-background/60 backdrop-blur-[2px]" aria-hidden />
      {highlightStyle ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-[top,left,width,height] duration-200"
          style={highlightStyle}
        />
      ) : null}
      <div
        ref={tooltipRef}
        className="pointer-events-auto absolute z-10 flex w-[min(360px,calc(100vw-24px))] max-h-[calc(100vh-24px)] flex-col gap-3 rounded-xl border border-primary/30 bg-card p-3 shadow-xl shadow-black/20"
        style={tooltipStyle}
        role="dialog"
        aria-live="polite"
        aria-label={`Tour step ${stepIndex + 1}`}
      >
        <div className="flex items-start justify-between gap-3 text-[11px] uppercase tracking-wide text-primary">
          <div className="flex flex-col gap-1">
            <span>Шаг {stepIndex + 1}/{TOUR_STEPS.length}</span>
            {isTargetMissing ? (
              <span className="text-[11px] normal-case text-muted-foreground">Элемент вне видимой области</span>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={finishTour} aria-label="Закрыть тур">
            ×
          </Button>
        </div>
        <div className="space-y-1.5 overflow-auto text-sm leading-relaxed text-muted-foreground">
          <p className="text-base font-semibold leading-tight text-foreground">{currentStep.title}</p>
          <p>{currentStep.description}</p>
        </div>
        <div className="flex items-center gap-2">
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
    </div>,
    document.body,
  );
};

export default TourOverlay;
