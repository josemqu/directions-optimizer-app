"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

export function Tooltip(props: {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  align?: Align;
  disabled?: boolean;
  className?: string;
}) {
  const { content, children, side = "top", align = "center", disabled, className } = props;
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; side: Side; arrow: number } | null>(null);
  const id = useId();
  const visible = open && !disabled;

  useLayoutEffect(() => {
    if (!visible) return;
    const update = () => {
      const anchor = anchorRef.current;
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;
      const a = anchor.getBoundingClientRect();
      const t = tooltip.getBoundingClientRect();
      const gap = 8;
      const margin = 8;
      let actualSide = side;
      if (side === "top" && a.top < t.height + gap + margin) actualSide = "bottom";
      if (side === "bottom" && innerHeight - a.bottom < t.height + gap + margin) actualSide = "top";
      if (side === "left" && a.left < t.width + gap + margin) actualSide = "right";
      if (side === "right" && innerWidth - a.right < t.width + gap + margin) actualSide = "left";
      const vertical = actualSide === "top" || actualSide === "bottom";
      const aligned = (start: number, size: number, length: number) =>
        align === "start" ? start : align === "end" ? start + size - length : start + (size - length) / 2;
      let left = vertical ? aligned(a.left, a.width, t.width) : actualSide === "left" ? a.left - t.width - gap : a.right + gap;
      let top = vertical ? actualSide === "top" ? a.top - t.height - gap : a.bottom + gap : aligned(a.top, a.height, t.height);
      left = Math.max(margin, Math.min(left, innerWidth - t.width - margin));
      top = Math.max(margin, Math.min(top, innerHeight - t.height - margin));
      const length = vertical ? t.width : t.height;
      const center = vertical ? a.left + a.width / 2 - left : a.top + a.height / 2 - top;
      setPosition({ left, top, side: actualSide, arrow: Math.max(8, Math.min(center, length - 8)) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new ResizeObserver(update);
    if (anchorRef.current) observer.observe(anchorRef.current);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [visible, side, align, content]);

  const closeIfInactive = () => {
    if (!hovered.current && !focused.current) {
      setOpen(false);
      setPosition(null);
    }
  };
  const vertical = position?.side === "top" || position?.side === "bottom";
  const arrowSide = position?.side === "top" ? "-bottom-1" : position?.side === "bottom" ? "-top-1" : position?.side === "left" ? "-right-1" : "-left-1";

  return (
    <span
      ref={anchorRef}
      className={(className ? className + " " : "") + "relative inline-flex"}
      aria-describedby={visible ? id : undefined}
      onMouseEnter={() => { hovered.current = true; setOpen(true); }}
      onMouseLeave={() => { hovered.current = false; closeIfInactive(); }}
      onFocusCapture={() => { focused.current = true; setOpen(true); }}
      onBlurCapture={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        focused.current = false;
        closeIfInactive();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { setOpen(false); setPosition(null); }
      }}
    >
      {children}
      {visible && createPortal(
        <span
          ref={tooltipRef}
          id={id}
          role="tooltip"
          className="pointer-events-none fixed z-[10000] w-max max-w-[min(20rem,calc(100vw-1rem))] rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg"
          style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }}
        >
          {content}
          <span
            aria-hidden
            className={"absolute h-2 w-2 rotate-45 bg-foreground " + arrowSide}
            style={vertical ? { left: (position?.arrow ?? 0) - 4 } : { top: (position?.arrow ?? 0) - 4 }}
          />
        </span>,
        document.body,
      )}
    </span>
  );
}
