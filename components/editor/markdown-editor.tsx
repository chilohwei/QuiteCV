"use client";

import dynamic from "next/dynamic";
import { ImagePlus } from "lucide-react";
import { useMemo, useRef } from "react";

const MonacoEditor = dynamic(
  () =>
    import("@monaco-editor/react").then((mod) => {
      // Load Monaco from our own origin (public/monaco/vs) instead of the default
      // jsdelivr CDN, which is unreliable / blocked on some networks and otherwise
      // leaves the editor stuck on "Loading...".
      mod.loader.config({ paths: { vs: "/monaco/vs" } });
      return mod.default;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#111316]">
        <div className="text-neutral-500 text-sm">加载编辑器...</div>
      </div>
    ),
  }
);

const EDITOR_FONT_FAMILY =
  "'Noto Sans Mono', 'Noto Sans SC', monospace";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme?: "light" | "dark";
  photoDataUrl?: string;
  onPhotoUpload?: (file: File) => void | Promise<void>;
}

export function MarkdownEditor({
  value,
  onChange,
  theme = "dark",
  photoDataUrl,
  onPhotoUpload,
}: MarkdownEditorProps) {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const editorOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      fontSize: 13.5,
      lineHeight: 22,
      fontFamily: EDITOR_FONT_FAMILY,
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
    <div className="relative w-full h-full">
      {onPhotoUpload && (
        <>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onPhotoUpload(file);
              }
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="absolute right-4 top-3 z-10 grid size-8 cursor-pointer place-items-center rounded-lg border border-neutral-700/80 bg-[#171a20]/92 text-neutral-300 shadow-[0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-[#20242d] hover:text-white active:bg-[#2a303c]"
            aria-label={photoDataUrl ? "更换照片" : "上传照片"}
            title={photoDataUrl ? "更换照片" : "上传照片"}
          >
            <ImagePlus className="size-4" />
          </button>
        </>
      )}
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
