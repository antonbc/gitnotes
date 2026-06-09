import type { Action } from "svelte/action";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipOptions {
  label: string;
  shortcut?: string;
  placement?: TooltipPlacement;
  disabled?: boolean;
}

const MARGIN = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ensureTooltip() {
  let el = document.querySelector<HTMLDivElement>("[data-gitnotes-tooltip]");
  if (el) return el;

  el = document.createElement("div");
  el.dataset.gitnotesTooltip = "true";
  el.className = "gn-tooltip";
  el.setAttribute("role", "tooltip");
  document.body.appendChild(el);
  return el;
}

function setTooltipContent(el: HTMLDivElement, options: TooltipOptions) {
  el.replaceChildren();

  const label = document.createElement("span");
  label.className = "gn-tooltip-label";
  label.textContent = options.label;
  el.appendChild(label);

  if (options.shortcut) {
    const shortcut = document.createElement("kbd");
    shortcut.className = "gn-tooltip-shortcut";
    shortcut.textContent = options.shortcut;
    el.appendChild(shortcut);
  }
}

function positionTooltip(node: HTMLElement, el: HTMLDivElement, placement: TooltipPlacement) {
  const rect = node.getBoundingClientRect();
  const tip = el.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  let top = 0;
  let left = 0;

  if (placement === "bottom") {
    top = rect.bottom + MARGIN;
    left = rect.left + rect.width / 2 - tip.width / 2;
  } else if (placement === "left") {
    top = rect.top + rect.height / 2 - tip.height / 2;
    left = rect.left - tip.width - MARGIN;
  } else if (placement === "right") {
    top = rect.top + rect.height / 2 - tip.height / 2;
    left = rect.right + MARGIN;
  } else {
    top = rect.top - tip.height - MARGIN;
    left = rect.left + rect.width / 2 - tip.width / 2;
  }

  el.style.left = `${clamp(left, MARGIN, viewportW - tip.width - MARGIN)}px`;
  el.style.top = `${clamp(top, MARGIN, viewportH - tip.height - MARGIN)}px`;
}

export const tooltip: Action<HTMLElement, TooltipOptions> = (node, initialOptions) => {
  let options = initialOptions;
  let showTimer: number | null = null;
  let visible = false;

  function hide() {
    if (showTimer !== null) {
      window.clearTimeout(showTimer);
      showTimer = null;
    }
    visible = false;
    const el = document.querySelector<HTMLDivElement>("[data-gitnotes-tooltip]");
    if (el) {
      el.classList.remove("visible");
      el.setAttribute("aria-hidden", "true");
    }
  }

  function show() {
    if (options.disabled || !options.label) return;
    if (showTimer !== null) window.clearTimeout(showTimer);

    showTimer = window.setTimeout(() => {
      const el = ensureTooltip();
      setTooltipContent(el, options);
      el.setAttribute("aria-hidden", "false");
      el.classList.add("visible");
      positionTooltip(node, el, options.placement ?? "top");
      visible = true;
      showTimer = null;
    }, 180);
  }

  function reposition() {
    if (!visible) return;
    const el = document.querySelector<HTMLDivElement>("[data-gitnotes-tooltip]");
    if (el) positionTooltip(node, el, options.placement ?? "top");
  }

  node.addEventListener("mouseenter", show);
  node.addEventListener("focus", show);
  node.addEventListener("mouseleave", hide);
  node.addEventListener("blur", hide);
  node.addEventListener("mousedown", hide);
  window.addEventListener("scroll", reposition, true);
  window.addEventListener("resize", reposition);

  return {
    update(nextOptions) {
      options = nextOptions;
      if (visible) {
        const el = document.querySelector<HTMLDivElement>("[data-gitnotes-tooltip]");
        if (el) {
          setTooltipContent(el, options);
          positionTooltip(node, el, options.placement ?? "top");
        }
      }
    },
    destroy() {
      hide();
      node.removeEventListener("mouseenter", show);
      node.removeEventListener("focus", show);
      node.removeEventListener("mouseleave", hide);
      node.removeEventListener("blur", hide);
      node.removeEventListener("mousedown", hide);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    },
  };
};
