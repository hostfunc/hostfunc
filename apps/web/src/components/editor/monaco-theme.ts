import type { OnMount } from "@monaco-editor/react";

/**
 * Brand-matched Monaco theme.
 *
 * Monaco cannot read CSS custom properties, so the hostfunc brand palette is
 * duplicated here as literal hex. These values mirror the `@theme` block in
 * `apps/web/src/app/globals.css` — keep the two in sync when the brand changes.
 */

type Monaco = Parameters<OnMount>[1];

export const HOSTFUNC_DARK_THEME = "hostfunc-dark";

let defined = false;

/**
 * Registers the `hostfunc-dark` theme on the Monaco instance. Safe to call
 * repeatedly — the work runs only once per page. Pass directly to the
 * `beforeMount` prop of `@monaco-editor/react`'s `Editor` / `DiffEditor` so the
 * theme exists before the editor instance is created.
 */
export function defineHostfuncTheme(monaco: Monaco): void {
  if (defined) return;
  defined = true;

  monaco.editor.defineTheme(HOSTFUNC_DARK_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "57534e", fontStyle: "italic" },
      { token: "comment.doc", foreground: "57534e", fontStyle: "italic" },
      { token: "keyword", foreground: "d97757" },
      { token: "keyword.json", foreground: "f59e0b" },
      { token: "tag", foreground: "d97757" },
      { token: "string", foreground: "84cc16" },
      { token: "string.value.json", foreground: "84cc16" },
      { token: "string.key.json", foreground: "93c5fd" },
      { token: "string.escape", foreground: "fbbf24" },
      { token: "attribute.value", foreground: "84cc16" },
      { token: "attribute.name", foreground: "22d3ee" },
      { token: "regexp", foreground: "84cc16" },
      { token: "annotation", foreground: "fbbf24" },
      { token: "number", foreground: "f59e0b" },
      { token: "type", foreground: "93c5fd" },
      { token: "type.identifier", foreground: "93c5fd" },
      { token: "identifier", foreground: "e7e5e4" },
      { token: "variable", foreground: "e7e5e4" },
      { token: "function", foreground: "fbbf24" },
      { token: "namespace", foreground: "10b981" },
      { token: "delimiter", foreground: "a8a29e" },
      { token: "metatag", foreground: "57534e" },
    ],
    colors: {
      "editor.background": "#0a0908",
      "editor.foreground": "#fafaf6",
      "editorCursor.foreground": "#e8a317",
      "editor.lineHighlightBackground": "#ffffff08",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#e8a3173d",
      "editor.inactiveSelectionBackground": "#e8a31722",
      "editor.selectionHighlightBackground": "#e8a31722",
      "editor.wordHighlightBackground": "#ffffff10",
      "editor.findMatchBackground": "#e8a3175c",
      "editor.findMatchHighlightBackground": "#e8a31733",
      "editorLineNumber.foreground": "#57534e",
      "editorLineNumber.activeForeground": "#a8a29e",
      "editorGutter.background": "#0a0908",
      "minimap.background": "#0a0908",
      "editorIndentGuide.background1": "#ffffff0d",
      "editorIndentGuide.activeBackground1": "#ffffff1f",
      "editorWhitespace.foreground": "#ffffff14",
      "editorBracketMatch.background": "#e8a31726",
      "editorBracketMatch.border": "#e8a31759",
      "editorBracketHighlight.foreground1": "#e8a317",
      "editorBracketHighlight.foreground2": "#22d3ee",
      "editorBracketHighlight.foreground3": "#10b981",
      "editorBracketHighlight.foreground4": "#93c5fd",
      "editorBracketHighlight.foreground5": "#fbbf24",
      "editorBracketHighlight.foreground6": "#d97757",
      "editorBracketHighlight.unexpectedBracket.foreground": "#f43f5e",
      "editorError.foreground": "#f43f5e",
      "editorWarning.foreground": "#e8a317",
      "editorInfo.foreground": "#22d3ee",
      "editorWidget.background": "#131211",
      "editorWidget.border": "#ffffff14",
      "editorSuggestWidget.background": "#131211",
      "editorSuggestWidget.border": "#ffffff14",
      "editorSuggestWidget.selectedBackground": "#e8a31726",
      "editorSuggestWidget.highlightForeground": "#e8a317",
      "editorHoverWidget.background": "#131211",
      "editorHoverWidget.border": "#ffffff14",
      "input.background": "#131211",
      "input.border": "#ffffff14",
      focusBorder: "#e8a31759",
      "list.hoverBackground": "#ffffff0a",
      "list.focusBackground": "#e8a31726",
      "list.highlightForeground": "#e8a317",
      "scrollbarSlider.background": "#e8a31733",
      "scrollbarSlider.hoverBackground": "#e8a3175c",
      "scrollbarSlider.activeBackground": "#e8a31787",
      "editorOverviewRuler.border": "#00000000",
      "editorGutter.modifiedBackground": "#22d3ee",
      "editorGutter.addedBackground": "#10b981",
      "editorGutter.deletedBackground": "#f43f5e",
      "diffEditor.insertedTextBackground": "#10b9811f",
      "diffEditor.removedTextBackground": "#f43f5e1f",
      "diffEditor.insertedLineBackground": "#10b98114",
      "diffEditor.removedLineBackground": "#f43f5e14",
      "diffEditor.diagonalFill": "#ffffff0d",
    },
  });
}
