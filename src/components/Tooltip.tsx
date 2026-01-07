"use client";

import type { ReactNode } from "react";

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
  const {
    content,
    children,
    side = "top",
    align = "center",
    disabled,
    className,
  } = props;

  if (disabled) return <>{children}</>;

  const sideClass =
    side === "top"
      ? "bottom-full mb-2"
      : side === "bottom"
      ? "top-full mt-2"
      : side === "left"
      ? "right-full mr-2"
      : "left-full ml-2";

  const alignClass =
    side === "top" || side === "bottom"
      ? align === "start"
        ? "left-0"
        : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2"
      : align === "start"
      ? "top-0"
      : align === "end"
      ? "bottom-0"
      : "top-1/2 -translate-y-1/2";

  const enterTranslate =
    side === "top"
      ? "translate-y-1"
      : side === "bottom"
      ? "-translate-y-1"
      : side === "left"
      ? "translate-x-1"
      : "-translate-x-1";

  const enterTranslateResetClass =
    side === "top" || side === "bottom"
      ? "group-hover:translate-y-0 group-focus-within:translate-y-0"
      : "group-hover:translate-x-0 group-focus-within:translate-x-0";

  const arrowAlignClass =
    side === "top" || side === "bottom"
      ? align === "start"
        ? "left-3"
        : align === "end"
        ? "right-3"
        : "left-1/2 -translate-x-1/2"
      : align === "start"
      ? "top-2"
      : align === "end"
      ? "bottom-2"
      : "top-1/2 -translate-y-1/2";

  const arrowSideClass =
    side === "top"
      ? "-bottom-1"
      : side === "bottom"
      ? "-top-1"
      : side === "left"
      ? "-right-1"
      : "-left-1";

  const arrowPositionClass =
    side === "top" || side === "bottom"
      ? arrowSideClass + " " + arrowAlignClass
      : arrowSideClass + " " + arrowAlignClass;

  return (
    <span
      className={
        (className ? className + " " : "") + "relative inline-flex group"
      }
      tabIndex={-1}
    >
      {children}
      <span
        role="tooltip"
        className={
          "pointer-events-none absolute z-50 " +
          sideClass +
          " " +
          alignClass +
          " whitespace-nowrap opacity-0 " +
          enterTranslate +
          " scale-95 transition-[opacity,transform] duration-150 ease-out " +
          "group-hover:opacity-100 group-hover:scale-100 " +
          "group-focus-within:opacity-100 group-focus-within:scale-100 " +
          enterTranslateResetClass
        }
      >
        <span className="relative inline-flex max-w-xs items-center rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-lg">
          {content}
          <span
            className={
              "absolute h-2 w-2 rotate-45 bg-foreground " + arrowPositionClass
            }
            aria-hidden
          />
        </span>
      </span>
    </span>
  );
}
