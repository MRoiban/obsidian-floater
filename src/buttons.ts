export interface InlineStyle {
  label: string;
  value: string;
  insertOffset: number;
  cursorOffset?: number;
  icon: string;
  mark?: string;
}

export const DEFAULT_TOOLBAR_BUTTON_ORDER = [
  "bold",
  "italics",
  "strikethrough",
  "code",
  "markdown-link",
  "block-link",
  "new-note",
  "text-color",
  "highlight"
] as const;

export type FloatingBarButtonId = (typeof DEFAULT_TOOLBAR_BUTTON_ORDER)[number];
export type ToolbarButtonGroup = "style" | "action" | "color";

export interface FloatingBarButton {
  id: FloatingBarButtonId;
  label: string;
  icon: string;
  group: ToolbarButtonGroup;
  requiresColors?: boolean;
  style?: InlineStyle;
}

export const FLOATING_BAR_BUTTONS: Record<
  FloatingBarButtonId,
  FloatingBarButton
> = {
  bold: {
    id: "bold",
    label: "Bold",
    icon: "mk-mark-strong",
    group: "style",
    style: {
      label: "Bold",
      value: "****",
      insertOffset: 2,
      icon: "mk-mark-strong",
      mark: "strong"
    }
  },
  italics: {
    id: "italics",
    label: "Italics",
    icon: "mk-mark-em",
    group: "style",
    style: {
      label: "Italics",
      value: "**",
      insertOffset: 1,
      icon: "mk-mark-em",
      mark: "em"
    }
  },
  strikethrough: {
    id: "strikethrough",
    label: "Strikethrough",
    icon: "mk-mark-strikethrough",
    group: "style",
    style: {
      label: "Strikethrough",
      value: "~~~~",
      insertOffset: 2,
      icon: "mk-mark-strikethrough",
      mark: "strikethrough"
    }
  },
  code: {
    id: "code",
    label: "Code",
    icon: "mk-mark-code",
    group: "style",
    style: {
      label: "Code",
      value: "``",
      insertOffset: 1,
      icon: "mk-mark-code",
      mark: "inline-code"
    }
  },
  "markdown-link": {
    id: "markdown-link",
    label: "Link",
    icon: "mk-mark-link",
    group: "style",
    style: {
      label: "Link",
      value: "[]()",
      insertOffset: 1,
      cursorOffset: 2,
      icon: "mk-mark-link"
    }
  },
  "block-link": {
    id: "block-link",
    label: "Block link",
    icon: "mk-mark-blocklink",
    group: "action"
  },
  "new-note": {
    id: "new-note",
    label: "New Note",
    icon: "new-note",
    group: "action"
  },
  "text-color": {
    id: "text-color",
    label: "Text Color",
    icon: "mk-mark-color",
    group: "color",
    requiresColors: true
  },
  highlight: {
    id: "highlight",
    label: "Highlight",
    icon: "mk-mark-highlight",
    group: "color",
    requiresColors: true
  }
};

export const isToolbarButtonId = (value: string): value is FloatingBarButtonId =>
  value in FLOATING_BAR_BUTTONS;

export const normalizeToolbarButtonOrder = (
  order: unknown
): FloatingBarButtonId[] => {
  const normalized = Array.isArray(order)
    ? order.filter(
        (value): value is FloatingBarButtonId =>
          typeof value === "string" && isToolbarButtonId(value)
      )
    : [];

  const unique = normalized.filter(
    (value, index) => normalized.indexOf(value) === index
  );

  for (const id of DEFAULT_TOOLBAR_BUTTON_ORDER) {
    if (!unique.includes(id)) unique.push(id);
  }

  return unique;
};

export const normalizeDisabledToolbarButtons = (
  disabled: unknown
): FloatingBarButtonId[] => {
  if (!Array.isArray(disabled)) return [];
  const normalized = disabled.filter(
    (value): value is FloatingBarButtonId =>
      typeof value === "string" && isToolbarButtonId(value)
  );
  return normalized.filter(
    (value, index) => normalized.indexOf(value) === index
  );
};

export const visibleToolbarButtons = (
  order: FloatingBarButtonId[],
  disabled: FloatingBarButtonId[],
  includeColors: boolean
) => {
  return normalizeToolbarButtonOrder(order)
    .map((id) => FLOATING_BAR_BUTTONS[id])
    .filter((button) => includeColors || !button.requiresColors)
    .filter((button) => !disabled.includes(button.id));
};
