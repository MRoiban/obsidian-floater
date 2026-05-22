import { EditorState, StateField } from "@codemirror/state";
import { EditorView, showTooltip, Tooltip, tooltips } from "@codemirror/view";
import { expandRange, oMarks, rangeIsMark, toggleMarkExtension } from "./marks";
import { InlineStyleToolbar } from "./toolbar";
import { FloatingBarPluginApi } from "./types";

const cursorTooltipField = (plugin: FloatingBarPluginApi) =>
  StateField.define<readonly Tooltip[]>({
    create: getCursorTooltips(plugin),

    update(tooltips, tr) {
      if (!tr.docChanged && !tr.selection) return tooltips;
      return getCursorTooltips(plugin)(tr.state);
    },

    provide: (field) => showTooltip.computeN([field], (state) => state.field(field))
  });

const getCursorTooltips =
  (plugin: FloatingBarPluginApi) =>
  (state: EditorState): readonly Tooltip[] => {
    if (!plugin.settings.inlineStyler || plugin.isTouchScreen()) return [];

    return state.selection.ranges
      .filter((range) => !range.empty)
      .map((range) => {
        const expandedRange = expandRange(range, state);
        const activeMarks = oMarks
          .map((mark) =>
            rangeIsMark(state, mark, expandedRange) ? mark.mark : ""
          )
          .filter((mark) => mark !== "");

        return {
          pos: Math.min(range.head, range.anchor),
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
              destroy: () => toolbar.destroy()
            };
          }
        };
      });
  };

export const floatingBarExtensions = (plugin: FloatingBarPluginApi) => [
  toggleMarkExtension,
  tooltips({ parent: document.body }),
  cursorTooltipField(plugin)
];
