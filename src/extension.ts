import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { EditorView, showTooltip, Tooltip, tooltips } from "@codemirror/view";
import { expandRange, oMarks, rangeIsMark, toggleMarkExtension } from "./marks";
import { InlineStyleToolbar } from "./toolbar";
import { FloatingBarPluginApi } from "./types";

const suppressToolbarEffect = StateEffect.define<boolean>();

let contextMenuSelectionActive = false;
let contextMenuSelectionTimer: number | null = null;

const markContextMenuSelectionActive = () => {
  contextMenuSelectionActive = true;

  if (contextMenuSelectionTimer !== null) {
    window.clearTimeout(contextMenuSelectionTimer);
  }

  contextMenuSelectionTimer = window.setTimeout(() => {
    contextMenuSelectionActive = false;
    contextMenuSelectionTimer = null;
  }, 1200);
};

const contextMenuSuppressField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    let nextValue = value;

    for (const effect of tr.effects) {
      if (effect.is(suppressToolbarEffect)) {
        nextValue = effect.value;
      }
    }

    if (nextValue && tr.selection && !contextMenuSelectionActive) {
      return false;
    }

    return nextValue;
  }
});

const cursorTooltipField = (plugin: FloatingBarPluginApi) =>
  StateField.define<readonly Tooltip[]>({
    create: getCursorTooltips(plugin),

    update(tooltips, tr) {
      const suppressToolbarChanged = tr.effects.some((effect) =>
        effect.is(suppressToolbarEffect)
      );
      if (!tr.docChanged && !tr.selection && !suppressToolbarChanged) {
        return tooltips;
      }
      return getCursorTooltips(plugin)(tr.state);
    },

    provide: (field) => showTooltip.computeN([field], (state) => state.field(field))
  });

const getCursorTooltips =
  (plugin: FloatingBarPluginApi) =>
  (state: EditorState): readonly Tooltip[] => {
    if (!plugin.settings.inlineStyler || plugin.isTouchScreen()) return [];
    if (state.field(contextMenuSuppressField, false)) return [];

    return state.selection.ranges
      .filter((range) => !range.empty)
      .map((range) => {
        const from = Math.min(range.head, range.anchor);
        const to = Math.max(range.head, range.anchor);
        const expandedRange = expandRange(range, state);
        const activeMarks = oMarks
          .map((mark) =>
            rangeIsMark(state, mark, expandedRange) ? mark.mark : ""
          )
          .filter((mark) => mark !== "");

        return {
          pos: from,
          end: to,
          above: true,
          strictSide: true,
          arrow: false,
          create: (view: EditorView) => {
            const dom = document.createElement("div");
            dom.className = "cm-tooltip-cursor";
            const toolbar = new InlineStyleToolbar(plugin, dom, {
              cm: view,
              activeMarks,
              mobile: false
            });
            return {
              dom,
              getCoords: () => selectionToolbarCoords(view, dom, from, to),
              destroy: () => toolbar.destroy()
            };
          }
        };
      });
  };

const selectionToolbarCoords = (
  view: EditorView,
  tooltip: HTMLElement,
  from: number,
  to: number
) => {
  const anchor = view.coordsAtPos(from);
  if (!anchor) {
    return {
      left: -10000,
      right: -10000,
      top: -10000,
      bottom: -10000
    };
  }

  const center = selectionHorizontalCenter(view, from, to);
  if (center === null) return anchor;

  const width = tooltip.getBoundingClientRect().width;
  const left = center - width / 2;

  return {
    left,
    right: left + width,
    top: anchor.top,
    bottom: anchor.bottom
  };
};

const selectionHorizontalCenter = (
  view: EditorView,
  from: number,
  to: number
): number | null => {
  try {
    const start = view.domAtPos(from);
    const end = view.domAtPos(to);
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);

    const rects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 0 && rect.height > 0
    );
    range.detach();

    if (rects.length === 0) return null;

    const left = Math.min(...rects.map((rect) => rect.left));
    const right = Math.max(...rects.map((rect) => rect.right));
    return (left + right) / 2;
  } catch {
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    if (!start || !end) return null;
    return (start.left + end.left) / 2;
  }
};

const setToolbarSuppressed = (view: EditorView, suppressed: boolean) => {
  if (view.state.field(contextMenuSuppressField, false) === suppressed) return;
  view.dispatch({ effects: suppressToolbarEffect.of(suppressed) });
};

const contextMenuSuppressExtension = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button === 2 || event.ctrlKey) {
      markContextMenuSelectionActive();
      setToolbarSuppressed(view, true);
    } else {
      contextMenuSelectionActive = false;
    }
  },

  contextmenu(_event, view) {
    markContextMenuSelectionActive();
    setToolbarSuppressed(view, true);
  },

  keydown(event, view) {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      markContextMenuSelectionActive();
      setToolbarSuppressed(view, true);
      return;
    }

    contextMenuSelectionActive = false;
  }
});

export const floatingBarExtensions = (plugin: FloatingBarPluginApi) => [
  toggleMarkExtension,
  contextMenuSuppressField,
  contextMenuSuppressExtension,
  tooltips({ parent: document.body }),
  cursorTooltipField(plugin)
];
