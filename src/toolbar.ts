import { EditorView } from "@codemirror/view";
import {
  FloatingBarButton,
  InlineStyle,
  visibleToolbarButtons
} from "./buttons";
import { COLOR_PALETTES, selectedPaletteColors } from "./colors";
import { uiIconSet } from "./icons";
import { toggleMark } from "./marks";
import { FloatingBarPluginApi } from "./types";

type ColorMode = "text" | "highlight" | null;

export class InlineStyleToolbar {
  private mode: 0 | 1 | 2;
  private colorMode: ColorMode = null;
  private showPalettePanel = false;
  private selectedPaletteId: string;

  constructor(
    private readonly plugin: FloatingBarPluginApi,
    private readonly root: HTMLElement,
    private readonly options: {
      cm?: EditorView;
      activeMarks: string[];
      mobile: boolean;
    }
  ) {
    this.mode = options.mobile ? 0 : 1;
    this.selectedPaletteId = plugin.settings.inlineStylerSelectedPalette;
    this.render();
  }

  destroy() {
    this.root.replaceChildren();
  }

  private get cm() {
    return this.options.cm ?? this.plugin.getActiveCM();
  }

  private render() {
    this.root.replaceChildren();

    const toolbar = document.createElement("div");
    toolbar.className = this.options.mobile ? "mk-style-toolbar" : "mk-style-menu";
    toolbar.addEventListener("mousedown", (event) => event.preventDefault());

    if (this.mode === 0 && this.options.mobile) {
      this.renderMakeMode(toolbar);
    } else if (this.mode === 2) {
      this.renderColorsMode(toolbar);
    } else {
      this.renderMarksMode(toolbar);
    }

    this.root.appendChild(toolbar);

    if (this.showPalettePanel) {
      this.root.appendChild(this.palettePanel());
    }
  }

  private iconButton(
    icon: string,
    label: string,
    onMouseDown: (event: MouseEvent) => void | Promise<void>,
    extraClass = ""
  ) {
    const button = document.createElement("div");
    button.className = `mk-mark ${extraClass}`.trim();
    button.setAttribute("aria-label", label);
    button.setAttribute("role", "button");
    button.innerHTML = uiIconSet[icon] ?? "";
    button.addEventListener("mousedown", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await onMouseDown(event);
    });
    return button;
  }

  private divider() {
    const divider = document.createElement("div");
    divider.className = "mk-divider";
    return divider;
  }

  private renderMakeMode(toolbar: HTMLElement) {
    toolbar.appendChild(
      this.iconButton("mk-make-slash", "Flow menu", () => this.makeMenu())
    );
    toolbar.appendChild(
      this.iconButton("mk-make-style", "Select style", () => {
        this.mode = 1;
        this.render();
      })
    );
    toolbar.appendChild(
      this.iconButton("mk-make-attach", "Attach image", () =>
        this.runCommand("editor:attach-file")
      )
    );
    toolbar.appendChild(
      this.iconButton("mk-make-indent", "Indent list", () =>
        this.runCommand("editor:indent-list")
      )
    );
    toolbar.appendChild(
      this.iconButton("mk-make-unindent", "Unindent list", () =>
        this.runCommand("editor:unindent-list")
      )
    );
    toolbar.appendChild(
      this.iconButton("mk-make-keyboard", "Toggle keyboard", () =>
        this.runCommand("editor:toggle-keyboard")
      )
    );
  }

  private renderMarksMode(toolbar: HTMLElement) {
    if (this.options.mobile) {
      toolbar.appendChild(
        this.iconButton("close", "Close", () => {
          this.mode = 0;
          this.render();
        })
      );
    }

    const buttons = visibleToolbarButtons(
      this.plugin.settings.toolbarButtonOrder,
      this.plugin.settings.disabledToolbarButtons,
      true
    );

    let previousGroup: string | null = null;
    let clearColorRendered = false;
    const hasColorSpan = this.detectColorSpanInSelection();

    for (const button of buttons) {
      if (previousGroup && previousGroup !== button.group) {
        toolbar.appendChild(this.divider());
      }

      if (button.group === "color" && hasColorSpan && !clearColorRendered) {
        toolbar.appendChild(this.clearColorButton());
        clearColorRendered = true;
      }

      toolbar.appendChild(this.renderToolbarButton(button));
      previousGroup = button.group;
    }
  }

  private renderToolbarButton(button: FloatingBarButton) {
    if (button.style) {
      const active =
        button.style.mark && this.options.activeMarks.includes(button.style.mark);

      return this.iconButton(
        button.icon,
        button.label,
        (event) => this.toggleMarkAction(event, button.style!),
        active ? "mk-mark-active" : ""
      );
    }

    switch (button.id) {
      case "block-link":
        return this.iconButton(button.icon, button.label, () => this.linkText());
      case "new-note":
        return this.groupedButton(
          this.iconButton(button.icon, button.label, async () => {
            const cm = this.cm;
            if (cm) await this.plugin.createNoteFromSelection(cm);
          })
        );
      case "text-color":
        return this.iconButton(button.icon, button.label, () => {
          this.colorMode = "text";
          this.mode = 2;
          this.render();
        });
      case "highlight":
        return this.iconButton(button.icon, button.label, () => {
          this.colorMode = "highlight";
          this.mode = 2;
          this.render();
        });
    }

    return this.iconButton(button.icon, button.label, () => undefined);
  }

  private renderColorsMode(toolbar: HTMLElement) {
    toolbar.appendChild(
      this.iconButton("close", "Close", () => {
        this.colorMode = null;
        this.mode = 1;
        this.showPalettePanel = false;
        this.render();
      })
    );

    for (const [name, value] of selectedPaletteColors(this.selectedPaletteId)) {
      const color = document.createElement("div");
      color.className = "mk-color";
      color.setAttribute("aria-label", name);
      color.setAttribute("role", "button");
      color.style.background = value;
      color.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.applyColor(value);
      });
      toolbar.appendChild(color);
    }

    toolbar.appendChild(
      this.iconButton(
        "palette",
        "Color Palette",
        () => {
          this.showPalettePanel = !this.showPalettePanel;
          this.render();
        },
        this.showPalettePanel ? "mk-mark-active" : ""
      )
    );
  }

  private groupedButton(button: HTMLElement) {
    const group = document.createElement("div");
    group.className = "mk-mark-group";
    group.appendChild(button);
    return group;
  }

  private clearColorButton() {
    const button = document.createElement("div");
    button.className = "mk-color mk-mark";
    button.setAttribute("aria-label", "Clear Color");
    button.setAttribute("role", "button");
    button.style.background = "var(--background-secondary)";
    button.style.border = "1px solid var(--background-modifier-border)";
    button.style.position = "relative";

    const icon = document.createElement("div");
    icon.className = "mk-color-none-icon";
    icon.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 20 20">
                  <line x1="2" y1="2" x2="18" y2="18" stroke="#ef4444" stroke-width="2" />
                </svg>`;
    button.appendChild(icon);

    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.clearColorFromSelection();
    });

    return button;
  }

  private palettePanel() {
    const panel = document.createElement("div");
    panel.className = "mk-color-palette-panel";
    panel.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    panel.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const header = document.createElement("div");
    header.className = "mk-color-palette-panel-header";

    const title = document.createElement("span");
    title.className = "mk-color-palette-panel-title";
    title.textContent = "Select Palette";
    header.appendChild(title);

    const close = document.createElement("div");
    close.className = "mk-color-palette-panel-close";
    close.innerHTML = uiIconSet.close;
    close.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showPalettePanel = false;
      this.render();
    });
    header.appendChild(close);
    panel.appendChild(header);

    const content = document.createElement("div");
    content.className = "mk-color-palette-panel-content";

    for (const palette of COLOR_PALETTES) {
      const item = document.createElement("div");
      item.className = "mk-palette-item";
      item.addEventListener("mousedown", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.selectedPaletteId = palette.id;
        this.plugin.settings.inlineStylerSelectedPalette = palette.id;
        await this.plugin.saveSettings();
        this.showPalettePanel = false;
        this.render();
      });

      const preview = document.createElement("div");
      preview.className = "mk-palette-preview";
      palette.colors.slice(0, 5).forEach((color, index) => {
        const circle = document.createElement("div");
        circle.className = "mk-palette-preview-circle";
        circle.style.background = color.value;
        circle.style.marginLeft = index > 0 ? "-6px" : "0";
        circle.style.zIndex = `${palette.colors.length - index}`;
        preview.appendChild(circle);
      });
      item.appendChild(preview);

      const name = document.createElement("div");
      name.className = "mk-palette-name";
      name.textContent = palette.name;
      item.appendChild(name);

      content.appendChild(item);
    }

    panel.appendChild(content);
    return panel;
  }

  private toggleMarkAction(event: MouseEvent, style: InlineStyle) {
    event.preventDefault();
    const cm = this.cm;
    if (!cm) return;

    if (style.mark) {
      cm.dispatch({
        annotations: toggleMark.of(style.mark)
      });
      cm.focus();
      return;
    }

    const selection = cm.state.selection.main;
    const selectedText = cm.state.sliceDoc(selection.from, selection.to);
    const prefix = style.value.substring(0, style.insertOffset);
    const suffix = style.value.substring(style.insertOffset);
    const insert = `${prefix}${selectedText}${suffix}`;

    cm.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert
      },
      selection: style.cursorOffset
        ? {
            anchor:
              selection.from +
              prefix.length +
              selectedText.length +
              style.cursorOffset,
            head:
              selection.from +
              prefix.length +
              selectedText.length +
              style.cursorOffset
          }
        : {
            anchor: selection.from + prefix.length,
            head: selection.from + prefix.length + selectedText.length
          }
    });
    cm.focus();
  }

  private linkText() {
    const cm = this.cm;
    if (!cm) return;
    const selection = cm.state.selection.main;
    const selectedText = cm.state.sliceDoc(selection.from, selection.to);
    this.plugin.selectFile((file) =>
      this.plugin.insertWikiLink(
        cm,
        file,
        selection.from,
        selection.to,
        selectedText
      )
    );
  }

  private makeMenu() {
    const cm = this.cm;
    if (!cm) return;

    const end = cm.state.selection.main.to;
    const trigger = this.plugin.settings.menuTriggerChar || "/";
    const insertChars =
      cm.state.sliceDoc(end - 1, end) === cm.state.lineBreak
        ? trigger
        : cm.state.lineBreak + trigger;

    cm.dispatch({
      changes: {
        from: end,
        to: end,
        insert: insertChars
      },
      selection: {
        head: end + insertChars.length,
        anchor: end + insertChars.length
      }
    });
    cm.focus();
  }

  private runCommand(id: string) {
    (this.plugin.app as any).commands?.executeCommandById(id);
  }

  private isGradient(color: string) {
    return (
      color.includes("linear-gradient") ||
      color.includes("radial-gradient") ||
      color.includes("conic-gradient")
    );
  }

  private getColorMarkup(color: string, selectedText: string) {
    if (this.colorMode === "text" && this.isGradient(color)) {
      return `<span style='background-image: ${color}; color: transparent; background-clip: text; -webkit-background-clip: text;'>${selectedText}</span>`;
    }
    if (this.colorMode === "text") {
      return `<span style='color: ${color}'>${selectedText}</span>`;
    }
    return `<mark style='background: ${color}'>${selectedText}</mark>`;
  }

  private applyColor(color: string) {
    const cm = this.cm;
    if (!cm) return;

    const selection = cm.state.selection.main;
    const selectedText = cm.state.sliceDoc(selection.from, selection.to);
    const markup = this.getColorMarkup(color, selectedText);

    cm.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: markup
      }
    });

    this.mode = 1;
    this.colorMode = null;
    this.showPalettePanel = false;
    this.render();
    cm.focus();
  }

  private detectColorSpanInSelection() {
    const cm = this.cm;
    if (!cm) return false;

    const selection = cm.state.selection.main;
    const selectedText = cm.state.sliceDoc(selection.from, selection.to);
    const colorSpanRegex =
      /<span[^>]*style=['"]*[^'"]*(?:color:|background-image:)[^'"]*['"]*[^>]*>.*?<\/span>/gi;
    const markRegex =
      /<mark[^>]*style=['"]*[^'"]*background:[^'"]*['"]*[^>]*>.*?<\/mark>/gi;

    return colorSpanRegex.test(selectedText) || markRegex.test(selectedText);
  }

  private clearColorFromSelection() {
    const cm = this.cm;
    if (!cm) return;

    const selection = cm.state.selection.main;
    const selectedText = cm.state.sliceDoc(selection.from, selection.to);
    const cleanedText = selectedText
      .replace(
        /<span[^>]*style=['"]*[^'"]*(?:color:|background-image:)[^'"]*['"]*[^>]*>(.*?)<\/span>/gi,
        "$1"
      )
      .replace(
        /<mark[^>]*style=['"]*[^'"]*background:[^'"]*['"]*[^>]*>(.*?)<\/mark>/gi,
        "$1"
      );

    cm.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: cleanedText
      }
    });
    this.render();
    cm.focus();
  }
}
