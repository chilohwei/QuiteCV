"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#111316]">
        <div className="text-neutral-500 text-sm">加载编辑器...</div>
      </div>
    ),
  }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme?: "light" | "dark";
}

export function MarkdownEditor({
  value,
  onChange,
  theme = "dark",
}: MarkdownEditorProps) {
  const editorOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 13.5,
      lineHeight: 22,
      fontFamily:
        "'Geist Mono','JetBrains Mono','SF Mono',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
      fontLigatures: true,
      wordWrap: "on" as const,
      padding: { top: 18, bottom: 18 },
      scrollBeyondLastLine: false,
      renderLineHighlight: "none" as const,
      matchBrackets: "never" as const,
      bracketPairColorization: { enabled: false } as any,
      cursorBlinking: "smooth" as const,
      cursorSmoothCaretAnimation: "on" as const,
      smoothScrolling: true,
      tabSize: 2,
      automaticLayout: true,
      lineNumbers: "off" as const,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      folding: true,
      foldingHighlight: true,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      occurrencesHighlight: "off" as const,
      renderWhitespace: "none" as const,
      renderControlCharacters: false,
      contextmenu: true,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      parameterHints: { enabled: false },
      suggest: {
        showWords: false,
        showSnippets: false,
      },
      scrollbar: {
        vertical: "auto" as const,
        horizontal: "auto" as const,
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    }),
    []
  );

  return (
    <div className="w-full h-full">
      <MonacoEditor
        height="100%"
        language="markdown"
        theme={theme === "dark" ? "resume-quiet-dark" : "vs"}
        value={value}
        onChange={(v) => onChange(v || "")}
        options={editorOptions}
        beforeMount={(monaco) => {
          // Define custom theme
          monaco.editor.defineTheme("resume-quiet-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
              // Keep token colors very restrained; Markdown should feel like writing, not coding.
              { token: "comment", foreground: "7b8190" },
              { token: "keyword", foreground: "a3a8b6" },
              { token: "string", foreground: "a3a8b6" },
              { token: "variable", foreground: "a3a8b6" },
              { token: "type", foreground: "a3a8b6" },
            ],
            colors: {
              "editor.background": "#111316",
              "editor.foreground": "#d7dbe4",
              "editorCursor.foreground": "#e8eaf0",
              "editor.selectionBackground": "#2a2f3a",
              "editor.inactiveSelectionBackground": "#232733",
              "editor.selectionHighlightBackground": "#2a2f3a55",
              "editor.findMatchBackground": "#2a2f3a",
              "editor.findMatchHighlightBackground": "#2a2f3a55",
              "editor.lineHighlightBackground": "#00000000",
              "editorLineNumber.foreground": "#606575",
              "editorLineNumber.activeForeground": "#8a90a2",
              "editorIndentGuide.background1": "#242834",
              "editorIndentGuide.activeBackground1": "#2b3040",
              "editorWhitespace.foreground": "#2a2f3a",
              "editorBracketMatch.background": "#00000000",
              "editorBracketMatch.border": "#3b4252",
              "editorWidget.background": "#171a20",
              "editorWidget.border": "#232734",
              "editorSuggestWidget.background": "#171a20",
              "editorSuggestWidget.border": "#232734",
              "editorSuggestWidget.foreground": "#cbd0db",
              "editorSuggestWidget.selectedBackground": "#232733",
              "editorHoverWidget.background": "#171a20",
              "editorHoverWidget.border": "#232734",
              "scrollbar.shadow": "#00000000",
            },
          });
        }}
        onMount={(editor, monaco) => {
          monaco.editor.setTheme(theme === "dark" ? "resume-quiet-dark" : "vs");

          // Add keyboard shortcuts
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            // Trigger save - will be handled by parent component
            const event = new CustomEvent("editor-save");
            window.dispatchEvent(event);
          });
        }}
      />
    </div>
  );
}
