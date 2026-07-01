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
import { DEFAULT_RESUME_MARKDOWN, getDefaultResumeMarkdown } from "@/data/default-resume";
import type { ResumeData, ResumeFontId, ResumeStyleConfig } from "@/types/resume";
import { DEFAULT_STYLE_CONFIG, RESUME_FONT_OPTIONS, RESUME_TEMPLATE_OPTIONS } from "@/types/resume";
import { useReactToPrint } from "react-to-print";

const STORAGE_KEY = "resume-markdown-content";
const STYLE_STORAGE_KEY = "resume-style-config";
const PHOTO_STORAGE_KEY = "resume-photo-data";
const PHOTO_PLACEHOLDER = "已上传照片";
const DEFAULT_TEMPLATE_PHOTO = "/photo.jpg";
const SUPPORTED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const AUTOSAVE_DELAY = 1000;
const LEGACY_WORKBENCH_STYLE_CONFIG: ResumeStyleConfig = {
  themeColor: "#1677ff",
  templateId: "classic",
  fontId: "noto-sans-sc",
  fontSize: 10.4,
  lineHeight: 1.56,
  pagePadding: 22,
  sectionSpacing: 1.12,
};

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
  const [styleConfig, setStyleConfig] = useState<ResumeStyleConfig>(DEFAULT_STYLE_CONFIG);
  const [scale, setScale] = useState(0.82);
  const [smartOnePage, setSmartOnePage] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMarkdown = readLocalStorage(STORAGE_KEY);
    const savedStyleConfig = readLocalStorage(STYLE_STORAGE_KEY);
    const savedPhoto = readLocalStorage(PHOTO_STORAGE_KEY);
    const detectedLanguages = readPreferredLanguages();
    const defaultMarkdown = getDefaultResumeMarkdown(detectedLanguages);

    if (savedMarkdown && !shouldUseRecruiterDefault(savedMarkdown) && !isOldPlaceholderTemplate(savedMarkdown)) {
      setMarkdown(savedMarkdown);
    } else {
      setMarkdown(defaultMarkdown);
    }

    setStyleConfig(readStyleConfig(savedStyleConfig));
    setPhotoDataUrl(savedPhoto || "");
    setPreferredLanguages(detectedLanguages);
    setIsLoaded(true);
  }, []);

  // Parse markdown when it changes
  useEffect(() => {
    if (!markdown) return;

    try {
      const data = parseResumeMarkdown(markdown, preferredLanguages);
      setResumeData(data);

    } catch {
      // Keep previous data on parse error
    }
  }, [markdown, preferredLanguages]);

  // Autosave markdown
  useEffect(() => {
    if (!isLoaded || !markdown) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      writeLocalStorage(STORAGE_KEY, markdown);
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [markdown, isLoaded]);

  // Autosave style settings
  useEffect(() => {
    if (!isLoaded) return;

    writeLocalStorage(STYLE_STORAGE_KEY, JSON.stringify(styleConfig));
  }, [styleConfig, isLoaded]);

  // Handle save shortcut
  useEffect(() => {
    const handleSave = () => {
      handleManualSave();
    };

    window.addEventListener("editor-save", handleSave);
    return () => window.removeEventListener("editor-save", handleSave);
  }, [markdown]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const handleManualSave = useCallback(() => {
    writeLocalStorage(STORAGE_KEY, markdown);
  }, [markdown]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const handlePhotoUpload = useCallback(async (file: File) => {
    try {
      const photoUrl = await createPhotoDataUrl(file);

      setPhotoDataUrl(photoUrl);
      const savedPhoto = writeLocalStorage(PHOTO_STORAGE_KEY, photoUrl);
      if (!savedPhoto) {
        showNotice("照片已用于预览，但浏览器本地空间不足，刷新后可能丢失。");
      }
      setMarkdown((current) =>
        upsertMarkdownFrontmatterField(
          current || getDefaultResumeMarkdown(preferredLanguages),
          "photo",
          PHOTO_PLACEHOLDER
        )
      );
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "照片上传失败。");
    }
  }, [preferredLanguages, showNotice]);

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
  const memoizedResumeData = useMemo(() => {
    if (!resumeData) return null;

    return {
      ...resumeData,
      metadata: {
        ...resumeData.metadata,
        photo: normalizePreviewPhoto(photoDataUrl || resumeData.metadata.photo),
      },
    };
  }, [photoDataUrl, resumeData]);

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#101114] overflow-hidden text-neutral-100">
      {notice && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 px-4" aria-live="polite">
          <div className="pointer-events-auto max-w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm text-amber-900 shadow-[0_12px_32px_rgba(16,16,16,0.16)]">
            {notice}
          </div>
        </div>
      )}
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
                  styleConfig={styleConfig}
                  onStyleConfigChange={setStyleConfig}
                  smartOnePage={smartOnePage}
                  onSmartOnePageChange={setSmartOnePage}
                />
              )}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col border-t border-neutral-800/50 bg-[#121318]">
          <div className="min-h-0 flex-1 bg-[#111316]">
            <MarkdownEditor
              value={markdown}
              onChange={setMarkdown}
              photoDataUrl={memoizedResumeData?.metadata.photo}
              onPhotoUpload={handlePhotoUpload}
            />
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
                <MarkdownEditor
                  value={markdown}
                  onChange={setMarkdown}
                  photoDataUrl={memoizedResumeData?.metadata.photo}
                  onPhotoUpload={handlePhotoUpload}
                />
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
                    styleConfig={styleConfig}
                    onStyleConfigChange={setStyleConfig}
                    smartOnePage={smartOnePage}
                    onSmartOnePageChange={setSmartOnePage}
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

function readStyleConfig(value: string | null): ResumeStyleConfig {
  if (!value) return DEFAULT_STYLE_CONFIG;

  try {
    const parsed = JSON.parse(value) as Partial<ResumeStyleConfig>;

    const nextConfig = {
      themeColor: readHexColor(parsed.themeColor, DEFAULT_STYLE_CONFIG.themeColor),
      templateId: readTemplateId(parsed.templateId),
      fontId: readFontId(parsed.fontId ?? (parsed as { fontFamily?: unknown }).fontFamily),
      fontSize: clampNumber(parsed.fontSize, 7.2, 12.4, DEFAULT_STYLE_CONFIG.fontSize),
      lineHeight: clampNumber(parsed.lineHeight, 1.08, 1.84, DEFAULT_STYLE_CONFIG.lineHeight),
      pagePadding: clampNumber(parsed.pagePadding, 6, 26, DEFAULT_STYLE_CONFIG.pagePadding),
      sectionSpacing: clampNumber(parsed.sectionSpacing, 0.35, 1.28, DEFAULT_STYLE_CONFIG.sectionSpacing),
    };

    return isSameStyleConfig(nextConfig, LEGACY_WORKBENCH_STYLE_CONFIG)
      ? DEFAULT_STYLE_CONFIG
      : nextConfig;
  } catch {
    return DEFAULT_STYLE_CONFIG;
  }
}

function isSameStyleConfig(a: ResumeStyleConfig, b: ResumeStyleConfig) {
  return (
    a.themeColor.toLowerCase() === b.themeColor.toLowerCase() &&
    a.templateId === b.templateId &&
    a.fontId === b.fontId &&
    a.fontSize === b.fontSize &&
    a.lineHeight === b.lineHeight &&
    a.pagePadding === b.pagePadding &&
    a.sectionSpacing === b.sectionSpacing
  );
}

function readFontId(value: unknown): ResumeFontId {
  const fallback = DEFAULT_STYLE_CONFIG.fontId;

  if (typeof value !== "string") return fallback;

  if (["simsun", "kaiti", "source-han-serif", "noto-serif-sc"].includes(value)) {
    return "noto-serif-sc";
  }

  if (value === "noto-serif") {
    return "noto-serif";
  }

  if (["microsoft-yahei", "simhei", "source-han-sans", "noto-sans-sc"].includes(value)) {
    return "noto-sans-sc";
  }

  if (value === "noto-sans") {
    return "noto-sans";
  }

  if (value === "noto-sans-mono") {
    return "noto-sans-mono";
  }

  return RESUME_FONT_OPTIONS.find((font) => font.id === value)?.id || fallback;
}

function readHexColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)
    ? value
    : fallback;
}

function readTemplateId(value: unknown) {
  if (typeof value !== "string") return DEFAULT_STYLE_CONFIG.templateId;

  return RESUME_TEMPLATE_OPTIONS.some((template) => template.id === value)
    ? value as ResumeStyleConfig["templateId"]
    : DEFAULT_STYLE_CONFIG.templateId;
}

function readPreferredLanguages() {
  const languages = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().locale,
    document.documentElement.lang,
  ];
  const normalizedLanguages = languages
    .filter((language): language is string => Boolean(language))
    .map((language) => language.trim().replace(/_/g, "-"))
    .filter(Boolean);

  return Array.from(new Set(normalizedLanguages));
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return Math.min(max, Math.max(min, value));
}

function normalizePreviewPhoto(photo: string | undefined) {
  if (!photo) return undefined;

  const value = photo.trim();
  if (value === PHOTO_PLACEHOLDER) return DEFAULT_TEMPLATE_PHOTO;
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  return undefined;
}

function createPhotoDataUrl(file: File) {
  if (!SUPPORTED_PHOTO_TYPES.has(file.type)) {
    throw new Error("仅支持 JPG、PNG 或 WebP 图片。");
  }

  if (file.size > MAX_PHOTO_FILE_SIZE_BYTES) {
    throw new Error("图片不能超过 5MB。");
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result === "string" &&
        /^data:image\/(?:png|jpe?g|webp);base64,/i.test(reader.result)
      ) {
        resolve(reader.result);
      } else {
        reject(new Error("无法读取图片。"));
      }
    };
    reader.onerror = () => reject(new Error("无法读取图片。"));
    reader.readAsDataURL(file);
  });
}

function readLocalStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function upsertMarkdownFrontmatterField(markdown: string, field: string, value: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const quotedValue = JSON.stringify(value);

  if (lines[0]?.trim() === "---") {
    const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");

    if (endIndex > 0) {
      const fieldIndex = lines.findIndex((line, index) =>
        index > 0 && index < endIndex && line.trimStart().startsWith(`${field}:`)
      );

      if (fieldIndex > 0) {
        lines[fieldIndex] = `${field}: ${quotedValue}`;
      } else {
        lines.splice(endIndex, 0, `${field}: ${quotedValue}`);
      }

      return lines.join("\n");
    }
  }

  return `---\n${field}: ${quotedValue}\n---\n\n${markdown}`;
}
