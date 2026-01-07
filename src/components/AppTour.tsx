"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { X } from "lucide-react";

type TourStep = {
  key: string;
  selector: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function getRect(el: Element | null) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    right: r.right,
    bottom: r.bottom,
  };
}

export function AppTour(props: {
  open: boolean;
  stepIndex: number;
  onStepIndexChange: (idx: number) => void;
  onClose: () => void;
  steps?: TourStep[];
}) {
  const steps = useMemo<TourStep[]>(
    () =>
      props.steps ?? [
        {
          key: "address",
          selector: "[data-tour='address-input']",
          title: "1) Agregá paradas",
          body: "Buscá una dirección, agregala como parada y repetí para armar tu lista.",
          placement: "bottom",
        },
        {
          key: "route",
          selector: "[data-tour='route-list']",
          title: "2) Reordená la lista",
          body: "Podés arrastrar las paradas para cambiar el orden antes de optimizar.",
          placement: "top",
        },
        {
          key: "optimize",
          selector: "[data-tour='optimize-route']",
          title: "3) Optimizá",
          body: "Cuando tengas al menos 3 paradas, tocá “Optimizar” para calcular un mejor orden.",
          placement: "bottom",
        },
        {
          key: "map-tab",
          selector: "[data-tour='bottom-nav-map']",
          title: "4) Mirá el mapa",
          body: "Cambiá a la pestaña Mapa para ver la ruta y los pins.",
          placement: "top",
        },
        {
          key: "map",
          selector: "[data-tour='map']",
          title: "5) Visualizá la ruta",
          body: "Acá ves las paradas y la línea de ruta. Si optimizás, la polilínea se actualiza.",
          placement: "left",
        },
        {
          key: "export",
          selector: "[data-tour='export-actions']",
          title: "6) Exportá",
          body: "Abrí la navegación en Google Maps o compartí la lista por WhatsApp.",
          placement: "top",
        },
      ],
    [props.steps]
  );

  const step = steps[props.stepIndex] ?? null;
  const [rect, setRect] = useState<ReturnType<typeof getRect>>(null);

  const goPrev = useCallback(() => {
    props.onStepIndexChange(Math.max(0, props.stepIndex - 1));
  }, [props.onStepIndexChange, props.stepIndex]);

  const goNext = useCallback(() => {
    const nextIdx = props.stepIndex + 1;
    if (nextIdx >= steps.length) {
      props.onClose();
      return;
    }
    props.onStepIndexChange(nextIdx);
  }, [props.onClose, props.onStepIndexChange, props.stepIndex, steps.length]);

  useLayoutEffect(() => {
    if (!props.open) return;
    if (!step) return;

    const el = document.querySelector(step.selector);
    setRect(getRect(el));

    if (el && "scrollIntoView" in el) {
      try {
        (el as HTMLElement).scrollIntoView({
          block: "center",
          inline: "center",
          behavior: "smooth",
        });
      } catch {
        // ignore
      }
    }
  }, [props.open, step?.key]);

  useEffect(() => {
    if (!props.open) return;
    if (!step) return;

    const update = () => {
      const el = document.querySelector(step.selector);
      setRect(getRect(el));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [props.open, step?.key]);

  useEffect(() => {
    if (!props.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.open, props.onClose, goNext, goPrev]);

  if (!props.open || !step) return null;

  const hasRect = !!rect && rect.width > 0 && rect.height > 0;

  const pad = 8;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 0;

  const highlight = hasRect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : {
        top: Math.max(16, viewportH / 2 - 60),
        left: Math.max(16, viewportW / 2 - 140),
        width: 280,
        height: 120,
      };

  const tooltipW = 340;
  const tooltipH = 160;
  const margin = 14;
  const placement = step.placement ?? "bottom";

  let top = highlight.top;
  let left = highlight.left;

  if (placement === "bottom") {
    top = highlight.top + highlight.height + margin;
    left = highlight.left + highlight.width / 2 - tooltipW / 2;
  } else if (placement === "top") {
    top = highlight.top - tooltipH - margin;
    left = highlight.left + highlight.width / 2 - tooltipW / 2;
  } else if (placement === "left") {
    top = highlight.top + highlight.height / 2 - tooltipH / 2;
    left = highlight.left - tooltipW - margin;
  } else if (placement === "right") {
    top = highlight.top + highlight.height / 2 - tooltipH / 2;
    left = highlight.left + highlight.width + margin;
  }

  const viewportPad = 12;
  top = clamp(top, viewportPad, viewportH - tooltipH - viewportPad);
  left = clamp(left, viewportPad, viewportW - tooltipW - viewportPad);

  const isFirst = props.stepIndex === 0;
  const isLast = props.stepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-1000" onClick={props.onClose}>
      <div
        className="absolute rounded-xl ring-2 ring-white/90 pointer-events-none tour-highlight-anim"
        style={{
          top: highlight.top,
          left: highlight.left,
          width: highlight.width,
          height: highlight.height,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
        }}
        aria-hidden
      />

      <div
        className="absolute rounded-xl border border-border bg-background/95 p-4 text-foreground shadow-xl backdrop-blur"
        style={{ top, left, width: tooltipW, minHeight: tooltipH }}
        role="dialog"
        aria-label="Guía paso a paso"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">
              {step.title}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {step.body}
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Cerrar guía"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Paso {props.stepIndex + 1} de {steps.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-50"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              {isLast ? "Finalizar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes tourHighlightPulse {
          0% {
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65),
              0 0 0 0 rgba(255, 255, 255, 0.35);
            opacity: 1;
          }
          60% {
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65),
              0 0 0 14px rgba(255, 255, 255, 0);
            opacity: 1;
          }
          100% {
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65),
              0 0 0 0 rgba(255, 255, 255, 0.25);
            opacity: 1;
          }
        }

        .tour-highlight-anim {
          animation: tourHighlightPulse 1.35s ease-in-out infinite;
          will-change: box-shadow;
        }
      `}</style>
    </div>
  );
}
