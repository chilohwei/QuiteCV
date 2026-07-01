"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { ResumeData, ResumeStyleConfig } from "@/types/resume";
import {
  DEFAULT_STYLE_CONFIG,
  getResumeFontAudience,
  getResumeFontOptionsForAudience,
} from "@/types/resume";
import { DefaultTemplate } from "@/components/templates/default-template";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  PencilLine,
  Printer,
  RotateCcw,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface ResumePreviewProps {
  data: ResumeData;
  scale: number;
  onScaleChange: (scale: number) => void;
  onPrint: () => void;
  onExportPdf: () => void;
  styleConfig: ResumeStyleConfig;
  onStyleConfigChange: (config: ResumeStyleConfig) => void;
  smartOnePage: boolean;
  onSmartOnePageChange: (enabled: boolean) => void;
}

type ActivePreviewControl = "scale" | "format" | "smart" | null;

const toolbarButtonClass = (active = false) =>
  [
    "cursor-pointer text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 active:bg-neutral-200 active:text-neutral-950 disabled:cursor-default",
    active ? "bg-neutral-100 text-neutral-950 ring-1 ring-neutral-300" : "",
  ].join(" ");

const toolbarTextButtonClass = (active = false) =>
  [
    "select-none rounded-md py-1 text-center text-[10px] leading-none tabular-nums transition-colors",
    "cursor-pointer hover:bg-neutral-100 hover:text-neutral-950 active:bg-neutral-200 disabled:cursor-default",
    active
      ? "bg-neutral-100 text-neutral-950 ring-1 ring-neutral-300"
      : "text-neutral-500",
  ].join(" ");

export const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  function ResumePreview(
    {
      data,
      scale,
      onScaleChange,
      onPrint,
      onExportPdf,
      styleConfig,
      onStyleConfigChange,
      smartOnePage,
      onSmartOnePageChange,
    },
    ref
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const printTargetRef = useRef<HTMLDivElement | null>(null);
    const previewControlsRef = useRef<HTMLDivElement | null>(null);
    const [fitScale, setFitScale] = useState(scale);
    const [pageMetrics, setPageMetrics] = useState<{
      width: number;
      height: number;
      offsets: number[];
    } | null>(null);
    const [pageState, setPageState] = useState({ current: 0, count: 1 });
    const [onePageToast, setOnePageToast] = useState<string | null>(null);
    const [formatPanelOpen, setFormatPanelOpen] = useState(false);
    const [activeControl, setActiveControl] = useState<ActivePreviewControl>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onePageFittedRef = useRef(true);
    const smartBaselineStyleRef = useRef<ResumeStyleConfig | null>(null);

    useEffect(() => {
      return () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      };
    }, []);

    useEffect(() => {
      if (!formatPanelOpen && !activeControl) return;

      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) return;

        if (previewControlsRef.current?.contains(target)) return;
        if (activeControl === "smart" && smartBaselineStyleRef.current) {
          onStyleConfigChange(smartBaselineStyleRef.current);
          smartBaselineStyleRef.current = null;
          onSmartOnePageChange(false);
        }
        setActiveControl(null);
        setFormatPanelOpen(false);
      };

      document.addEventListener("pointerdown", handlePointerDown);
      return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [activeControl, formatPanelOpen, onSmartOnePageChange, onStyleConfigChange]);

    useEffect(() => {
      if (smartOnePage) {
        onePageFittedRef.current = true;
        setOnePageToast(null);
      }
    }, [smartOnePage]);

    const handleSmartOnePageResult = useCallback((result: {
      fittedOnePage: boolean;
      styleConfig: ResumeStyleConfig;
    }) => {
      onStyleConfigChange(result.styleConfig);
      onSmartOnePageChange(false);

      if (!result.fittedOnePage && onePageFittedRef.current) {
        setOnePageToast("已收紧到最小排版；内容仍超过一页，可继续精简内容");
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setOnePageToast(null), 4000);
      } else if (result.fittedOnePage) {
        setOnePageToast(null);
      }

      onePageFittedRef.current = result.fittedOnePage;
    }, [onSmartOnePageChange, onStyleConfigChange]);

    const handleSmartOnePageRequest = useCallback(() => {
      if (activeControl === "smart") {
        if (smartBaselineStyleRef.current) {
          onStyleConfigChange(smartBaselineStyleRef.current);
          smartBaselineStyleRef.current = null;
        }
        setActiveControl(null);
        onSmartOnePageChange(false);
        return;
      }

      smartBaselineStyleRef.current = styleConfig;
      setActiveControl("smart");
      setFormatPanelOpen(false);
      onePageFittedRef.current = true;
      setOnePageToast(null);
      onSmartOnePageChange(true);
    }, [activeControl, onSmartOnePageChange, onStyleConfigChange, styleConfig]);

    const handleFormatPanelToggle = useCallback(() => {
      setFormatPanelOpen((open) => {
        const nextOpen = !open;
        setActiveControl(nextOpen ? "format" : null);
        return nextOpen;
      });
    }, []);

    const handleScaleIndicatorToggle = useCallback(() => {
      setFormatPanelOpen(false);
      setActiveControl((current) => (current === "scale" ? null : "scale"));
    }, []);

    const setPrintTargetRef = useCallback(
      (node: HTMLDivElement | null) => {
        printTargetRef.current = node;

        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    const getPreviewPages = useCallback(() => {
      const target = printTargetRef.current;
      if (!target) return [];

      const pages = Array.from(
        target.querySelectorAll<HTMLElement>(".recruiter-resume")
      );
      const fallbackPages = pages.length
        ? pages
        : Array.from(target.querySelectorAll<HTMLElement>(".resume-paper"));

      return fallbackPages.filter((page) => page.offsetWidth > 0 && page.offsetHeight > 0);
    }, []);

    const updatePageMetrics = useCallback(() => {
      const pages = getPreviewPages();
      if (!pages.length) {
        setPageMetrics(null);
        setPageState({ current: 0, count: 1 });
        return;
      }

      const firstPage = pages[0];
      const offsets = pages.map((page) => page.offsetLeft - firstPage.offsetLeft);
      setPageMetrics({
        width: firstPage.offsetWidth * fitScale,
        height: firstPage.offsetHeight * fitScale,
        offsets,
      });

      setPageState((previous) =>
        previous.current < pages.length && previous.count === pages.length
          ? previous
          : { current: Math.min(previous.current, pages.length - 1), count: pages.length }
      );
    }, [fitScale, getPreviewPages]);

    const goToPage = useCallback(
      (pageIndex: number) => {
        setPageState((previous) => ({
          count: previous.count,
          current: Math.max(0, Math.min(pageIndex, previous.count - 1)),
        }));
      },
      []
    );

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const updateScale = () => {
        const availableWidth = Math.max(0, viewport.clientWidth - 48);
        const a4Width = 210 * 3.7795;
        const maxScale = Math.max(0.36, Math.min(1.2, availableWidth / a4Width));
        setFitScale(Math.min(scale, maxScale));
      };

      updateScale();

      const observer = new ResizeObserver(updateScale);
      observer.observe(viewport);

      return () => observer.disconnect();
    }, [scale]);

    useEffect(() => {
      const viewport = viewportRef.current;
      const target = printTargetRef.current;
      if (!viewport || !target) return;

      let frame = requestAnimationFrame(updatePageMetrics);
      const scheduleUpdate = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(updatePageMetrics);
      };

      const observer = new ResizeObserver(scheduleUpdate);
      observer.observe(viewport);
      observer.observe(target);

      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }, [data, fitScale, smartOnePage, styleConfig, updatePageMetrics]);

    useEffect(() => {
      setPageState((previous) => ({ ...previous, current: 0 }));
    }, [data, smartOnePage, styleConfig]);

    return (
      <div
        className="group relative h-full w-full overflow-hidden bg-[#f7f7f5]"
      >
        {/* Right-side vertical toolbar (quiet, edge-docked) */}
        <div className="no-print pointer-events-none absolute inset-0 z-20">
          <div
            ref={previewControlsRef}
            className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 md:right-4"
          >
            <div className="flex flex-col items-stretch gap-0.5 rounded-xl border border-neutral-200/80 bg-white/86 p-0.5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <div className="flex flex-col items-stretch gap-0.5 px-0.5 py-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={toolbarButtonClass()}
                      onClick={() => onScaleChange(Math.max(0.5, Number((scale - 0.1).toFixed(2))))}
                      disabled={scale <= 0.5}
                      aria-label="缩小"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={10}>
                    缩小
                  </TooltipContent>
                </Tooltip>

                <button
                  type="button"
                  className={toolbarTextButtonClass(activeControl === "scale")}
                  onClick={handleScaleIndicatorToggle}
                  aria-label="缩放比例"
                  aria-pressed={activeControl === "scale"}
                >
                  {Math.round(scale * 100)}%
                </button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={toolbarButtonClass()}
                      onClick={() => onScaleChange(Math.min(1.2, Number((scale + 0.1).toFixed(2))))}
                      disabled={scale >= 1.2}
                      aria-label="放大"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={10}>
                    放大
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="px-1">
                <div className="h-px w-full bg-neutral-200/80" />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={toolbarButtonClass(activeControl === "format")}
                    onClick={handleFormatPanelToggle}
                    aria-label="编辑外观"
                    aria-expanded={formatPanelOpen}
                    aria-pressed={activeControl === "format"}
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={10}>
                  编辑外观
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={toolbarButtonClass(activeControl === "smart" || smartOnePage)}
                    onClick={handleSmartOnePageRequest}
                    aria-label="智能一页"
                    aria-pressed={activeControl === "smart" || smartOnePage}
                  >
                    <WandSparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={10}>
                  智能一页
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={toolbarButtonClass()}
                    onClick={onPrint}
                    aria-label="打印"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={10}>
                  打印
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={toolbarButtonClass()}
                    onClick={onExportPdf}
                    aria-label="导出 PDF"
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={10}>
                  导出 PDF
                </TooltipContent>
              </Tooltip>

            </div>

            {formatPanelOpen && (
              <FormatPanel
                resumeLanguage={data.metadata.language}
                styleConfig={styleConfig}
                onStyleConfigChange={onStyleConfigChange}
              />
            )}

          </div>

          {pageState.count > 1 && (
            <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-neutral-200/80 bg-white/88 p-1 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              {pageState.current > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-full px-2 text-xs text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => goToPage(pageState.current - 1)}
                  aria-label="上一页"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  上一页
                </Button>
              )}

              <span className="select-none px-2 text-[11px] tabular-nums text-neutral-500">
                {pageState.current + 1} / {pageState.count}
              </span>

              {pageState.current < pageState.count - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-full px-2 text-xs text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => goToPage(pageState.current + 1)}
                  aria-label="下一页"
                >
                  下一页
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div
          ref={viewportRef}
          className="resume-preview-viewport h-full w-full overflow-auto px-5 py-5"
        >
          <div
            style={{
              width: pageMetrics ? `${pageMetrics.width}px` : `${210 * fitScale}mm`,
              minHeight: `${297 * fitScale}mm`,
              height: pageMetrics ? `${pageMetrics.height}px` : undefined,
            }}
            className="relative mx-auto mt-2 overflow-hidden"
          >
            <div
              ref={setPrintTargetRef}
              style={{
                transform: `scale(${fitScale}) translateX(-${pageMetrics?.offsets[pageState.current] ?? 0}px)`,
                transformOrigin: "top left",
              }}
              className="resume-print-target w-fit transition-transform duration-150"
            >
              <DefaultTemplate
                data={data}
                styleConfig={styleConfig}
                smartOnePage={smartOnePage}
                onSmartOnePageResult={handleSmartOnePageResult}
              />
            </div>

          </div>
        </div>

        {onePageToast && (
          <div className="no-print pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2" aria-live="polite">
            <div className="pointer-events-auto max-w-[88vw] rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800 shadow-[0_12px_32px_rgba(16,16,16,0.12)]">
              {onePageToast}
            </div>
          </div>
        )}
      </div>
    );
  }
);

function FormatPanel({
  resumeLanguage,
  styleConfig,
  onStyleConfigChange,
}: {
  resumeLanguage?: string;
  styleConfig: ResumeStyleConfig;
  onStyleConfigChange: (config: ResumeStyleConfig) => void;
}) {
  const update = (patch: Partial<ResumeStyleConfig>) => {
    onStyleConfigChange({ ...styleConfig, ...patch });
  };
  const fontAudience = getResumeFontAudience(resumeLanguage);
  const fontOptions = getResumeFontOptionsForAudience(fontAudience);
  const activeFontId = fontOptions.some((font) => font.id === styleConfig.fontId)
    ? styleConfig.fontId
    : fontOptions[0]?.id;

  return (
    <div className="absolute right-12 top-0 w-[min(18rem,calc(100vw-4rem))] rounded-xl border border-neutral-200/80 bg-white/95 p-3.5 text-neutral-900 shadow-[0_18px_48px_rgba(16,16,16,0.16)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">排版设置</div>
        <button
          type="button"
          onClick={() => onStyleConfigChange(DEFAULT_STYLE_CONFIG)}
          className="grid size-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="恢复默认样式"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <span className="text-xs font-medium text-neutral-600">字体</span>
          <div className="grid grid-cols-2 gap-2">
            {fontOptions.map((font) => (
              <button
                key={font.id}
                type="button"
                onClick={() => update({ fontId: font.id })}
                className={
                  activeFontId === font.id
                    ? "min-h-12 rounded-md border border-neutral-900 bg-neutral-900 px-2.5 py-2 text-left text-white"
                    : "min-h-12 rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-left text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                }
                title={font.description}
              >
                <span className="block text-xs font-semibold leading-none">{font.name}</span>
                <span className={activeFontId === font.id ? "mt-1 block text-[10px] leading-tight text-neutral-300" : "mt-1 block text-[10px] leading-tight text-neutral-500"}>
                  {font.shortName}
                </span>
              </button>
            ))}
          </div>
        </div>

        <RangeControl
          label="字号"
          value={styleConfig.fontSize}
          min={7.2}
          max={12.4}
          step={0.05}
          precision={2}
          onChange={(fontSize) => update({ fontSize })}
        />
        <RangeControl
          label="行距"
          value={styleConfig.lineHeight}
          min={1.08}
          max={1.84}
          step={0.01}
          precision={2}
          onChange={(lineHeight) => update({ lineHeight })}
        />
        <RangeControl
          label="页边距"
          value={styleConfig.pagePadding}
          min={6}
          max={26}
          step={0.25}
          precision={2}
          onChange={(pagePadding) => update({ pagePadding })}
        />
        <RangeControl
          label="段落间距"
          value={styleConfig.sectionSpacing}
          min={0.35}
          max={1.28}
          step={0.01}
          precision={2}
          onChange={(sectionSpacing) => update({ sectionSpacing })}
        />
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  precision,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  precision: number;
  onChange: (value: number) => void;
}) {
  const normalized = normalizeNumber(value, min, max, precision);

  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-xs font-medium text-neutral-600">
        {label}
        <span className="tabular-nums text-neutral-900">{normalized.toFixed(precision)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={normalized}
        onChange={(event) => onChange(normalizeNumber(Number(event.target.value), min, max, precision))}
        className="format-range w-full"
        aria-label={label}
      />
    </label>
  );
}

function normalizeNumber(value: number, min: number, max: number, precision: number) {
  return Number(Math.min(max, Math.max(min, value)).toFixed(precision));
}
