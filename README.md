# Obsidian Floater

Standalone Obsidian plugin that provides a Make.md-style floating formatting bar for selected editor text.

The floater appears only for non-empty text selections. It stays out of the way of Obsidian's native right-click context menu: right-clicking hides the floater, and selections created by a right-click do not activate it.

## Features

- Floating selected-text toolbar for Live Preview / CodeMirror editor selections
- Bold, italic, strikethrough, inline code, and link formatting
- Wiki-link insertion through an Obsidian file picker
- New-note creation from selected text
- Text color and highlight controls with configurable palettes
- Customizable button order and visibility through a draggable settings preview
- Mobile toolbar support through Obsidian's mobile toolbar

## Behavior

- Select text with the mouse or keyboard to show the floater.
- Right-click or open the context menu to hide the floater.
- The floater is horizontally centered over the selected text range.
- The floater is positioned above the selection and keeps below Obsidian's native menu layer.

## Development

This project uses Bun.

```bash
bun install
bun run build
```

For watch mode:

```bash
bun run dev
```

## Deploy

Deploy the built plugin files to the default local Obsidian vault plugin folder:

```bash
bun run deploy
```

The deploy script copies:

- `main.js`
- `manifest.json`
- `styles.css`

You can pass a custom target directory:

```bash
scripts/deploy-to-obsidian.sh /path/to/vault/.obsidian/plugins/obsidian-floater
```

After deploying, reload Obsidian or toggle the plugin off and on.

## Project Layout

- `src/extension.ts`: CodeMirror extension, tooltip creation, context-menu suppression, and floater positioning
- `src/toolbar.ts`: Toolbar UI and formatting actions
- `src/marks.ts`: Markdown mark detection and toggle behavior
- `src/buttons.ts`: Toolbar button definitions and ordering
- `src/colors.ts`: Color palette definitions
- `styles.css`: Floater, palette, and settings styles
- `scripts/deploy-to-obsidian.sh`: Build/copy helper for local Obsidian testing

## Upstream Reference

This plugin is based on the selected-text floating formatting bar from [Make.md](https://github.com/Make-md/makemd), especially Make.md `1.3.4`:

- `src/basics/menus/inlineStylerView/*`
- `src/css/Menus/InlineMenu.css`
