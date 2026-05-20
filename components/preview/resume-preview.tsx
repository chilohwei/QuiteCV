"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { ResumeData, ResumeStyleConfig } from "@/types/resume";
import { DefaultTemplate } from "@/components/templates/default-template";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, FileDown, Printer, ZoomIn, ZoomOut } from "lucide-react";

interface ResumePreviewProps {
  data: ResumeData;
  scale: number;
  onScaleChange: (scale: number) => void;
  onPrint: () => void;
  onExportPdf: () => void;
  styleConfig: ResumeStyleConfig;
}

export const ResumePreview = forwardRef<HTMLDivElement, ResumePreviewProps>(
  function ResumePreview(
    {
      data,
      scale,
      onScaleChange,
      onPrint,
      onExportPdf,
      styleConfig,
    },
    ref
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const printTargetRef = useRef<HTMLDivElement | null>(null);
    const [fitScale, setFitScale] = useState(scale);
    const [pageMetrics, setPageMetrics] = useState<{
      width: number;
      height: number;
      offsets: number[];
    } | null>(null);
    const [pageState, setPageState] = useState({ current: 0, count: 1 });

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
      const node = printTargetRef.current;
      if (!node) return;

      const updateHeight = () => {
        updatePageMetrics();
      };

      updateHeight();

      const observer = new ResizeObserver(updateHeight);
      observer.observe(node);

      return () => observer.disconnect();
    }, [data, fitScale, styleConfig, updatePageMetrics]);

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
    }, [data, fitScale, styleConfig, updatePageMetrics]);

    useEffect(() => {
      setPageState((previous) => ({ ...previous, current: 0 }));
    }, [data]);

    return (
      <div
        className="group relative h-full w-full overflow-hidden bg-[#f7f7f5]"
      >
        {/* Right-side vertical toolbar (quiet, edge-docked) */}
        <div className="no-print pointer-events-none absolute inset-0 z-20">
          <div className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 md:right-4">
            <div className="flex flex-col items-stretch gap-0.5 rounded-xl border border-neutral-200/80 bg-white/86 p-0.5 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <div className="flex flex-col items-stretch gap-0.5 px-0.5 py-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-neutral-700 hover:bg-neutral-100"
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

                <div className="select-none text-center text-[10px] tabular-nums text-neutral-500 leading-none py-1">
                  {Math.round(scale * 100)}%
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-neutral-700 hover:bg-neutral-100"
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
                    className="text-neutral-700 hover:bg-neutral-100"
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
                    className="text-neutral-700 hover:bg-neutral-100"
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
              />
            </div>

          </div>
        </div>
      </div>
    );
  }
);
