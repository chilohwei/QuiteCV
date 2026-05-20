"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { ResumePreview } from "@/components/preview/resume-preview";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { parseResumeMarkdown } from "@/lib/parse-resume";
import { DEFAULT_RESUME_MARKDOWN } from "@/data/default-resume";
import type { ResumeData } from "@/types/resume";
import { DEFAULT_STYLE_CONFIG } from "@/types/resume";
import { useReactToPrint } from "react-to-print";

const STORAGE_KEY = "resume-markdown-content";
const AUTOSAVE_DELAY = 1000;

function shouldUseRecruiterDefault(savedMarkdown: string) {
  return (
    savedMarkdown.includes("傲软投屏(ApowerMirror)") &&
    savedMarkdown.includes("## 其他技能") &&
    !savedMarkdown.includes("## 个人简介")
  );
}

function isOldPlaceholderTemplate(savedMarkdown: string) {
  // Safe migration: only replace when it's clearly the untouched starter template
  // (generic name/email + placeholder headings).
  return (
    savedMarkdown.includes("name: 你的姓名") &&
    savedMarkdown.includes("email: your.name@example.com") &&
    savedMarkdown.includes("## 核心亮点") &&
    savedMarkdown.includes("### 公司名称") &&
    savedMarkdown.includes("### 学校名称")
  );
}

export default function ResumePage() {
  const [markdown, setMarkdown] = useState<string>("");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [scale, setScale] = useState(0.82);
  const [isLoaded, setIsLoaded] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMarkdown = localStorage.getItem(STORAGE_KEY);

    if (savedMarkdown && !shouldUseRecruiterDefault(savedMarkdown) && !isOldPlaceholderTemplate(savedMarkdown)) {
      setMarkdown(savedMarkdown);
    } else {
      setMarkdown(DEFAULT_RESUME_MARKDOWN);
    }

    setIsLoaded(true);
  }, []);

  // Parse markdown when it changes
  useEffect(() => {
    if (!markdown) return;

    try {
      const data = parseResumeMarkdown(markdown);
      setResumeData(data);

    } catch {
      // Keep previous data on parse error
    }
  }, [markdown]);

  // Autosave markdown
  useEffect(() => {
    if (!isLoaded || !markdown) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, markdown);
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [markdown, isLoaded]);

  // Handle save shortcut
  useEffect(() => {
    const handleSave = () => {
      handleManualSave();
    };

    window.addEventListener("editor-save", handleSave);
    return () => window.removeEventListener("editor-save", handleSave);
  }, [markdown]);

  const handleManualSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, markdown);
  }, [markdown]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: resumeData?.metadata.name || "简历",
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        html, body {
          height: 100%;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    `,
  });

  const handleExportPdf = useCallback(() => {
    handlePrint();
  }, [handlePrint]);

  // Memoize the resume data for preview
  const memoizedResumeData = useMemo(() => resumeData, [resumeData]);

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#101114] overflow-hidden text-neutral-100">
      <div className="flex min-h-0 flex-1 flex-col bg-[#101114] md:hidden">
        <section className="flex min-h-0 flex-[1.4] flex-col bg-[#f7f7f5]">
          <div className="min-h-0 flex-1 overflow-hidden">
            {memoizedResumeData && (
                <ResumePreview
                  data={memoizedResumeData}
                  scale={Math.min(scale, 0.62)}
                  onScaleChange={(next) => setScale(Math.min(next, 0.62))}
                  onPrint={handlePrint}
                  onExportPdf={handleExportPdf}
                  styleConfig={DEFAULT_STYLE_CONFIG}
                />
              )}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col border-t border-neutral-800/50 bg-[#121318]">
          <div className="min-h-0 flex-1 bg-[#111316]">
            <MarkdownEditor value={markdown} onChange={setMarkdown} />
          </div>
        </section>
      </div>

      <div className="hidden flex-1 min-h-0 bg-[#101114] md:block">
        <ResizablePanelGroup direction="horizontal" className="min-h-0">
          <ResizablePanel
            defaultSize={50}
            minSize={24}
            maxSize={65}
            className="min-w-[300px]"
          >
            <section className="flex h-full min-h-0 flex-col border-r border-neutral-900/50 bg-[#121318]">
              <div className="min-h-0 flex-1 bg-[#111316]">
                <MarkdownEditor value={markdown} onChange={setMarkdown} />
              </div>
            </section>
          </ResizablePanel>

          <ResizableHandle
            className="hidden bg-neutral-900/60 after:bg-transparent md:flex"
          />

          <ResizablePanel defaultSize={50} minSize={35}>
            <section className="flex h-full min-h-0 flex-col bg-[#f7f7f5]">
              <div className="min-h-0 flex-1 overflow-hidden">
                {memoizedResumeData ? (
                  <ResumePreview
                    ref={printRef}
                    data={memoizedResumeData}
                    scale={scale}
                    onScaleChange={setScale}
                    onPrint={handlePrint}
                    onExportPdf={handleExportPdf}
                    styleConfig={DEFAULT_STYLE_CONFIG}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-neutral-500">
                    Markdown 解析后会在这里显示预览。
                  </div>
                )}
              </div>
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
