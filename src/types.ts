import { EditorView } from "@codemirror/view";
import { App, MarkdownView, TFile } from "obsidian";
import {
  DEFAULT_TOOLBAR_BUTTON_ORDER,
  FloatingBarButtonId
} from "./buttons";

export interface InlineStylerSettings {
  inlineStyler: boolean;
  inlineStylerColors: boolean;
  inlineStylerSelectedPalette: string;
  mobileMakeBar: boolean;
  menuTriggerChar: string;
  toolbarButtonOrder: FloatingBarButtonId[];
  disabledToolbarButtons: FloatingBarButtonId[];
}

export const DEFAULT_SETTINGS: InlineStylerSettings = {
  inlineStyler: true,
  inlineStylerColors: true,
  inlineStylerSelectedPalette: "",
  mobileMakeBar: false,
  menuTriggerChar: "/",
  toolbarButtonOrder: [...DEFAULT_TOOLBAR_BUTTON_ORDER],
  disabledToolbarButtons: []
};

export interface FloatingBarPluginApi {
  app: App;
  settings: InlineStylerSettings;
  saveSettings(): Promise<void>;
  getActiveCM(): EditorView | undefined;
  getActiveMarkdownView(): MarkdownView | undefined;
  isTouchScreen(): boolean;
  selectFile(onChoose: (file: TFile) => void): void;
  createNoteFromSelection(view: EditorView): Promise<void>;
  insertWikiLink(
    view: EditorView,
    file: TFile,
    from: number,
    to: number,
    selectedText: string
  ): void;
}
