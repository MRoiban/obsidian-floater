import { EditorView } from "@codemirror/view";
import {
  App,
  FuzzySuggestModal,
  MarkdownView,
  Notice,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  normalizePath
} from "obsidian";
import {
  DEFAULT_TOOLBAR_BUTTON_ORDER,
  FLOATING_BAR_BUTTONS,
  FloatingBarButtonId,
  normalizeDisabledToolbarButtons,
  normalizeToolbarButtonOrder
} from "./buttons";
import { COLOR_PALETTES } from "./colors";
import { floatingBarExtensions } from "./extension";
import { uiIconSet } from "./icons";
import { toggleMark } from "./marks";
import { InlineStyleToolbar } from "./toolbar";
import {
  DEFAULT_SETTINGS,
  FloatingBarPluginApi,
  InlineStylerSettings
} from "./types";

export default class FloatingFormattingBarPlugin
  extends Plugin
  implements FloatingBarPluginApi
{
  settings: InlineStylerSettings;
  private mobileRoot: HTMLElement | null = null;
  private mobileToolbar: InlineStyleToolbar | null = null;

  async onload() {
    await this.loadSettings();

    this.registerEditorExtension(floatingBarExtensions(this));
    this.addSettingTab(new FloatingBarSettingTab(this.app, this));
    this.registerFormattingCommands();
    this.refreshMobileToolbar();

    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.refreshMobileToolbar())
    );
  }

  onunload() {
    this.removeMobileToolbar();
    document.body.classList.remove("mk-mobile-styler");
  }

  async loadSettings() {
    const loaded = (await this.loadData()) ?? {};
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      inlineStyler: true,
      inlineStylerColors: true,
      toolbarButtonOrder: normalizeToolbarButtonOrder(
        loaded.toolbarButtonOrder ?? DEFAULT_TOOLBAR_BUTTON_ORDER
      ),
      disabledToolbarButtons: normalizeDisabledToolbarButtons(
        loaded.disabledToolbarButtons
      )
    };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  isTouchScreen() {
    return Platform.isMobile;
  }

  getActiveCM(): EditorView | undefined {
    let active: EditorView | undefined;

    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!(leaf.view instanceof MarkdownView)) return;
      const cm = (leaf.view.editor as any)?.cm as EditorView | undefined;
      if (cm?.hasFocus) {
        active = cm;
      }
    });

    if (active) return active;

    const view = this.getActiveMarkdownView();
    return (view?.editor as any)?.cm as EditorView | undefined;
  }

  getActiveMarkdownView(): MarkdownView | undefined {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) return activeView;

    let markdownView: MarkdownView | undefined;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView && !markdownView) {
        markdownView = leaf.view;
      }
    });
    return markdownView;
  }

  selectFile(onChoose: (file: TFile) => void) {
    new MarkdownFileSuggestModal(this.app, onChoose).open();
  }

  insertWikiLink(
    view: EditorView,
    file: TFile,
    from: number,
    to: number,
    selectedText: string
  ) {
    const sourcePath = this.app.workspace.getActiveFile()?.path ?? "";
    const linkText = this.app.metadataCache.fileToLinktext(
      file,
      sourcePath,
      true
    );

    view.dispatch({
      changes: {
        from,
        to,
        insert: `[[${linkText}|${selectedText}]]`
      }
    });
    view.focus();
  }

  async createNoteFromSelection(view: EditorView) {
    const selection = view.state.selection.main;
    const selectedText = view.state.sliceDoc(selection.from, selection.to);
    const title = this.sanitizeNoteTitle(selectedText);

    if (!title) {
      new Notice("Select text to create a note.");
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    const folderPath =
      activeFile?.parent?.path && activeFile.parent.path !== "/"
        ? activeFile.parent.path
        : "";
    const path = await this.resolveNotePath(folderPath, title);
    const existing = this.app.vault.getAbstractFileByPath(path);
    const target =
      existing instanceof TFile ? existing : await this.app.vault.create(path, "");

    const linkText = this.app.metadataCache.fileToLinktext(
      target,
      activeFile?.path ?? "",
      true
    );

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `[[${linkText}|${selectedText}]]`
      }
    });
    view.focus();
  }

  refreshMobileToolbar() {
    document.body.classList.toggle(
      "mk-mobile-styler",
      this.settings.mobileMakeBar
    );

    this.removeMobileToolbar();

    if (
      !Platform.isMobile ||
      !this.settings.mobileMakeBar ||
      !this.settings.inlineStyler
    ) {
      return;
    }

    const container = (this.app as any).mobileToolbar?.containerEl as
      | HTMLElement
      | undefined;

    if (!container) return;

    const root = document.createElement("div");
    root.className = "mk-mobile-inline-styler-root";
    container.appendChild(root);
    this.mobileRoot = root;
    this.mobileToolbar = new InlineStyleToolbar(this, root, {
      activeMarks: [],
      mobile: true
    });
  }

  async requestEditorRefresh() {
    await this.saveSettings();
    (this.app.workspace as any).updateOptions?.();
    this.refreshMobileToolbar();
  }

  private removeMobileToolbar() {
    this.mobileToolbar?.destroy();
    this.mobileToolbar = null;
    this.mobileRoot?.remove();
    this.mobileRoot = null;
  }

  private sanitizeNoteTitle(text: string) {
    return text
      .split(/\r?\n/)[0]
      .replace(/\[\[|\]\]/g, "")
      .replace(/[\\/#^|[\]:*?"<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
  }

  private async resolveNotePath(folderPath: string, title: string) {
    const basePath = normalizePath(
      folderPath ? `${folderPath}/${title}.md` : `${title}.md`
    );
    const existing = this.app.vault.getAbstractFileByPath(basePath);
    if (existing instanceof TFile) return basePath;
    if (!existing) return basePath;

    let index = 1;
    while (true) {
      const candidate = normalizePath(
        folderPath ? `${folderPath}/${title} ${index}.md` : `${title} ${index}.md`
      );
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
      index++;
    }
  }

  private registerFormattingCommands() {
    this.addCommand({
      id: "toggle-bold",
      name: "Toggle bold",
      editorCallback: (_editor, view) =>
        this.dispatchMark(view as MarkdownView, "strong")
    });
    this.addCommand({
      id: "toggle-italics",
      name: "Toggle italics",
      editorCallback: (_editor, view) =>
        this.dispatchMark(view as MarkdownView, "em")
    });
    this.addCommand({
      id: "toggle-strikethrough",
      name: "Toggle strikethrough",
      editorCallback: (_editor, view) =>
        this.dispatchMark(view as MarkdownView, "strikethrough")
    });
    this.addCommand({
      id: "toggle-inline-code",
      name: "Toggle inline code",
      editorCallback: (_editor, view) =>
        this.dispatchMark(view as MarkdownView, "inline-code")
    });
  }

  private dispatchMark(view: MarkdownView, mark: string) {
    const cm = (view.editor as any)?.cm as EditorView | undefined;
    cm?.dispatch({
      annotations: toggleMark.of(mark)
    });
  }
}

class MarkdownFileSuggestModal extends FuzzySuggestModal<TFile> {
  constructor(app: App, private readonly onChoose: (file: TFile) => void) {
    super(app);
    this.setPlaceholder("Select file");
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(item: TFile): string {
    return item.path;
  }

  onChooseItem(item: TFile) {
    this.onChoose(item);
  }
}

class FloatingBarSettingTab extends PluginSettingTab {
  private draggedButtonId: FloatingBarButtonId | null = null;
  private suppressPreviewClick = false;

  constructor(app: App, private readonly plugin: FloatingFormattingBarPlugin) {
    super(app, plugin);
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h3", { text: "Toolbar Buttons" });

    const customizer = containerEl.createDiv({
      cls: "mk-toolbar-customizer"
    });
    this.renderToolbarCustomizer(customizer);

    new Setting(containerEl)
      .setName("Button layout")
      .setDesc("Drag buttons to rearrange them. Click a button to enable or disable it.")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.toolbarButtonOrder = [
            ...DEFAULT_TOOLBAR_BUTTON_ORDER
          ];
          this.plugin.settings.disabledToolbarButtons = [];
          await this.plugin.requestEditorRefresh();
          this.display();
        })
      );

    containerEl.createEl("h3", { text: "Flow Styler" });

    new Setting(containerEl)
      .setName("Color Palette")
      .setDesc("Palette used by the color picker in the floating bar")
      .addDropdown((dropdown) => {
        for (const palette of COLOR_PALETTES) {
          dropdown.addOption(palette.id, palette.name);
        }
        dropdown
          .setValue(
            this.plugin.settings.inlineStylerSelectedPalette ||
              "default-palette"
          )
          .onChange(async (value) => {
            this.plugin.settings.inlineStylerSelectedPalette = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Mobile Make Bar")
      .setDesc("Show make bar on mobile devices")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.mobileMakeBar)
          .onChange(async (value) => {
            this.plugin.settings.mobileMakeBar = value;
            await this.plugin.requestEditorRefresh();
          })
      );
  }

  private renderToolbarCustomizer(container: HTMLElement) {
    const preview = container.createDiv({
      cls: "mk-toolbar-customizer-preview mk-style-menu"
    });
    preview.setAttribute("aria-label", "Floating toolbar button layout");

    let previousGroup: string | null = null;
    const disabled = new Set(this.plugin.settings.disabledToolbarButtons);

    for (const id of this.plugin.settings.toolbarButtonOrder) {
      const button = FLOATING_BAR_BUTTONS[id];
      if (!button) continue;

      if (previousGroup && previousGroup !== button.group) {
        preview.appendChild(this.previewDivider());
      }

      preview.appendChild(this.previewButton(id, disabled.has(id)));
      previousGroup = button.group;
    }

    preview.addEventListener("dragover", (event) => {
      if (!this.draggedButtonId) return;
      event.preventDefault();
    });

    preview.addEventListener("drop", async (event) => {
      if (!this.draggedButtonId) return;
      event.preventDefault();
      await this.moveToolbarButtonToEnd(this.draggedButtonId);
    });
  }

  private previewDivider() {
    const divider = document.createElement("div");
    divider.className = "mk-divider";
    return divider;
  }

  private previewButton(id: FloatingBarButtonId, disabled: boolean) {
    const config = FLOATING_BAR_BUTTONS[id];
    const button = document.createElement("div");
    button.className = [
      "mk-toolbar-preview-button",
      "mk-mark",
      disabled ? "mk-toolbar-preview-button-disabled" : ""
    ]
      .filter(Boolean)
      .join(" ");
    button.draggable = true;
    button.tabIndex = 0;
    button.setAttribute("role", "button");
    button.setAttribute(
      "aria-label",
      `${config.label} ${disabled ? "disabled" : "enabled"}`
    );
    button.setAttribute("title", config.label);
    button.innerHTML = uiIconSet[config.icon] ?? "";

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.suppressPreviewClick) return;
      await this.toggleToolbarButton(id);
    });

    button.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      await this.toggleToolbarButton(id);
    });

    button.addEventListener("dragstart", (event) => {
      this.draggedButtonId = id;
      this.suppressPreviewClick = true;
      button.classList.add("is-dragging");
      event.dataTransfer?.setData("text/plain", id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });

    button.addEventListener("dragend", () => {
      button.classList.remove("is-dragging");
      window.setTimeout(() => {
        this.draggedButtonId = null;
        this.suppressPreviewClick = false;
      }, 0);
    });

    button.addEventListener("dragover", (event) => {
      if (!this.draggedButtonId || this.draggedButtonId === id) return;
      event.preventDefault();
      button.classList.add("is-drop-target");
    });

    button.addEventListener("dragleave", () => {
      button.classList.remove("is-drop-target");
    });

    button.addEventListener("drop", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.remove("is-drop-target");
      const draggedId =
        this.draggedButtonId ??
        (event.dataTransfer?.getData("text/plain") as FloatingBarButtonId);
      await this.moveToolbarButtonBefore(draggedId, id);
    });

    return button;
  }

  private async toggleToolbarButton(id: FloatingBarButtonId) {
    const disabled = new Set(
      normalizeDisabledToolbarButtons(this.plugin.settings.disabledToolbarButtons)
    );

    if (disabled.has(id)) {
      disabled.delete(id);
    } else {
      disabled.add(id);
    }

    const order = normalizeToolbarButtonOrder(
      this.plugin.settings.toolbarButtonOrder
    );
    this.plugin.settings.disabledToolbarButtons = order.filter((buttonId) =>
      disabled.has(buttonId)
    );
    await this.plugin.requestEditorRefresh();
    this.display();
  }

  private async moveToolbarButtonBefore(
    draggedId: FloatingBarButtonId,
    targetId: FloatingBarButtonId
  ) {
    if (!draggedId || draggedId === targetId) return;

    const order = normalizeToolbarButtonOrder(
      this.plugin.settings.toolbarButtonOrder
    );
    const withoutDragged = order.filter((id) => id !== draggedId);
    const targetIndex = withoutDragged.indexOf(targetId);
    if (targetIndex < 0) return;

    withoutDragged.splice(targetIndex, 0, draggedId);
    this.plugin.settings.toolbarButtonOrder = withoutDragged;
    this.plugin.settings.disabledToolbarButtons = normalizeDisabledToolbarButtons(
      this.plugin.settings.disabledToolbarButtons
    );
    await this.plugin.requestEditorRefresh();
    this.display();
  }

  private async moveToolbarButtonToEnd(id: FloatingBarButtonId) {
    const order = normalizeToolbarButtonOrder(
      this.plugin.settings.toolbarButtonOrder
    );
    const withoutDragged = order.filter((buttonId) => buttonId !== id);
    withoutDragged.push(id);
    this.plugin.settings.toolbarButtonOrder = withoutDragged;
    await this.plugin.requestEditorRefresh();
    this.display();
  }
}
