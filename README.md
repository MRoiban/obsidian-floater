# Make.md Floating Formatting Bar

Standalone Obsidian plugin that extracts the selected-text floating formatting bar from [Make.md](https://github.com/Make-md/makemd).

The toolbar appears above non-empty editor selections and mirrors the Make.md Flow Styler controls:

- bold, italic, strikethrough, inline code, and markdown link formatting
- wiki-link insertion through a file picker
- new-note creation from selected text
- optional text color and highlight controls with Make.md color palettes
- optional mobile Make Bar rendering in Obsidian's mobile toolbar
- customizable button order and visibility through a draggable settings preview

Upstream reference: Make.md `1.3.4`, especially `src/basics/menus/inlineStylerView/*` and `src/css/Menus/InlineMenu.css`.

## Build

This project uses Bun.

```bash
bun install
bun run build
```

Deploy directly to the default Obsidian vault plugin folder:

```bash
bun run deploy
```
