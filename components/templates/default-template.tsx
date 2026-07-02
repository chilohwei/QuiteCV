"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ResumeData, ResumeSection, ResumeSectionItem, ResumeStyleConfig } from "@/types/resume";
import { getResumeFontAudience, getResumeFontOption } from "@/types/resume";

interface DefaultTemplateProps {
  data: ResumeData;
  styleConfig: ResumeStyleConfig;
  smartOnePage?: boolean;
  onSmartOnePageResult?: (result: { fittedOnePage: boolean }) => void;
}

const MM_TO_PX = 3.7795;
const PAGE_GAP_MM = 8;

interface PageProfile {
  padX: number;
  padY: number;
  headerMb: number;
  headerMin: number;
  headerPt: number;
  photoW: number;
  photoH: number;
  name: number;
  meta: number;
  sectionGap: number;
  headingMb: number;
  headingPb: number;
  headingSize: number;
  body: number;
  intro: number;
  title: number;
  bulletMt: number;
  bulletGap: number;
  itemGap: number;
  line: number;
  introLine: number;
  bodyLine: number;
}

const PAGE_PROFILE: PageProfile = {
  padX: 15,
  padY: 15,
  headerMb: 8,
  headerMin: 30,
  headerPt: 4,
  photoW: 24,
  photoH: 30,
  name: 18,
  meta: 10.2,
  sectionGap: 6,
  headingMb: 3,
  headingPb: 1,
  headingSize: 12,
  body: 10,
  intro: 10.5,
  title: 10.8,
  bulletMt: 2,
  bulletGap: 2,
  itemGap: 4,
  line: 1.56,
  introLine: 1.78,
  bodyLine: 1.68,
};

type SmartCompressionStep = {
  font: number;
  line: number;
  pad: number;
  spacing: number;
};

const SMART_COMPRESSION_KEYFRAMES: SmartCompressionStep[] = [
  { font: 1, line: 1, pad: 1, spacing: 1 },
  { font: 1, line: 0.98, pad: 1, spacing: 0.95 },
  { font: 0.98, line: 0.96, pad: 0.92, spacing: 0.86 },
  { font: 0.95, line: 0.93, pad: 0.84, spacing: 0.74 },
  { font: 0.92, line: 0.9, pad: 0.76, spacing: 0.64 },
  { font: 0.88, line: 0.86, pad: 0.68, spacing: 0.54 },
  { font: 0.84, line: 0.82, pad: 0.6, spacing: 0.45 },
  { font: 0.8, line: 0.78, pad: 0.52, spacing: 0.38 },
];

// Interpolate between keyframes so the first candidate that fits one page
// sits close to a full page instead of over-compressing and leaving a large
// blank area at the bottom.
const SMART_STEP_SUBDIVISIONS = 3;

const SMART_COMPRESSION_STEPS: SmartCompressionStep[] =
  SMART_COMPRESSION_KEYFRAMES.flatMap((step, index, keyframes) => {
    const next = keyframes[index + 1];
    if (!next) return [step];

    return Array.from({ length: SMART_STEP_SUBDIVISIONS }, (_, subIndex) => {
      const t = subIndex / SMART_STEP_SUBDIVISIONS;
      return {
        font: step.font + (next.font - step.font) * t,
        line: step.line + (next.line - step.line) * t,
        pad: step.pad + (next.pad - step.pad) * t,
        spacing: step.spacing + (next.spacing - step.spacing) * t,
      };
    });
  });

type ResumeLayout = {
  profileIndex: number;
  pageBlockIds: string[][];
};

type MeasuredResumeLayout = ResumeLayout & {
  totalHeight: number;
  maxPageHeight: number;
};

type PageCandidate = {
  profile: PageProfile;
  styleConfig: ResumeStyleConfig;
};

type TemplateVisual = {
  accent: string;
  paperBg: string;
  text: string;
  muted: string;
  headingText: string;
  headingBorder: string;
  headingBg: string;
  headingRadius: string;
  headingPaddingX: string;
  headingPaddingY: string;
  headerRule: "none" | "top" | "left" | "band";
  photoRadius: string;
  tagBg: string;
  tagText: string;
};

type ResumeBlock =
  | { id: string; kind: "header" }
  | { id: string; kind: "paragraph"; title: string; text: string; intro?: boolean }
  | { id: string; kind: "bullet-line"; title?: string; text: string; dense?: boolean; first: boolean; after: "bullet" | "item" | "section" }
  | { id: string; kind: "work-item"; title: string; item: ResumeSectionItem; showHeading: boolean; isLastInSection: boolean; hasBullets: boolean }
  | { id: string; kind: "education-item"; title: string; item: ResumeSectionItem; showHeading: boolean; isLastInSection: boolean; hasBullets: boolean }
  | { id: string; kind: "generic"; section: ResumeSection };

function createBasePageProfile(styleConfig: ResumeStyleConfig): PageProfile {
  const fontScale = clampProfileValue(styleConfig.fontSize, 7.2, 12.4) / PAGE_PROFILE.body;
  const lineHeight = clampProfileValue(styleConfig.lineHeight, 1.08, 1.84);
  const pagePadding = clampProfileValue(styleConfig.pagePadding, 6, 26);
  const sectionSpacing = clampProfileValue(styleConfig.sectionSpacing, 0.35, 1.28);

  return {
    ...PAGE_PROFILE,
    padX: roundProfileValue(pagePadding),
    padY: roundProfileValue(pagePadding),
    headerMb: roundProfileValue(PAGE_PROFILE.headerMb * sectionSpacing),
    name: roundProfileValue(PAGE_PROFILE.name * fontScale),
    meta: roundProfileValue(PAGE_PROFILE.meta * fontScale),
    sectionGap: roundProfileValue(PAGE_PROFILE.sectionGap * sectionSpacing),
    headingMb: roundProfileValue(PAGE_PROFILE.headingMb * sectionSpacing),
    headingPb: roundProfileValue(PAGE_PROFILE.headingPb * sectionSpacing),
    headingSize: roundProfileValue(PAGE_PROFILE.headingSize * fontScale),
    body: roundProfileValue(PAGE_PROFILE.body * fontScale),
    intro: roundProfileValue(PAGE_PROFILE.intro * fontScale),
    title: roundProfileValue(PAGE_PROFILE.title * fontScale),
    bulletMt: roundProfileValue(PAGE_PROFILE.bulletMt * sectionSpacing),
    bulletGap: roundProfileValue(PAGE_PROFILE.bulletGap * sectionSpacing),
    itemGap: roundProfileValue(PAGE_PROFILE.itemGap * sectionSpacing),
    line: roundProfileValue(lineHeight),
    introLine: roundProfileValue(lineHeight + (PAGE_PROFILE.introLine - PAGE_PROFILE.line)),
    bodyLine: roundProfileValue(lineHeight + (PAGE_PROFILE.bodyLine - PAGE_PROFILE.line)),
  };
}

function createSmartPageCandidates(styleConfig: ResumeStyleConfig): PageCandidate[] {
  return SMART_COMPRESSION_STEPS.map((step) =>
    createPageCandidate({
      ...styleConfig,
      fontSize: styleConfig.fontSize * step.font,
      lineHeight: styleConfig.lineHeight * step.line,
      pagePadding: styleConfig.pagePadding * step.pad,
      sectionSpacing: styleConfig.sectionSpacing * step.spacing,
    })
  );
}

function createPageCandidate(styleConfig: ResumeStyleConfig): PageCandidate {
  const nextStyleConfig = {
    ...styleConfig,
    fontSize: clampProfileValue(styleConfig.fontSize, 7.2, 12.4),
    lineHeight: clampProfileValue(styleConfig.lineHeight, 1.08, 1.84),
    pagePadding: clampProfileValue(styleConfig.pagePadding, 6, 26),
    sectionSpacing: clampProfileValue(styleConfig.sectionSpacing, 0.35, 1.28),
  };

  return {
    profile: createBasePageProfile(nextStyleConfig),
    styleConfig: {
      ...nextStyleConfig,
      fontSize: roundProfileValue(nextStyleConfig.fontSize),
      lineHeight: roundProfileValue(nextStyleConfig.lineHeight),
      pagePadding: roundProfileValue(nextStyleConfig.pagePadding),
      sectionSpacing: roundProfileValue(nextStyleConfig.sectionSpacing),
    },
  };
}

function clampProfileValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundProfileValue(value: number) {
  return Number(value.toFixed(3));
}

function getPageStyle(page: PageProfile, fontFamily: string): CSSProperties {
  return {
    fontFamily,
    fontSize: `${page.body}pt`,
    lineHeight: page.line,
  };
}

function getTemplateVisual(styleConfig: ResumeStyleConfig): TemplateVisual {
  const accent = styleConfig.themeColor || "#1a56db";

  switch (styleConfig.templateId) {
    case "product":
      return {
        accent,
        paperBg: "#fbfffe",
        text: "#10201d",
        muted: "#36524d",
        headingText: "#10201d",
        headingBorder: accent,
        headingBg: "rgba(15, 118, 110, 0.08)",
        headingRadius: "2mm",
        headingPaddingX: "2mm",
        headingPaddingY: "0.9mm",
        headerRule: "left",
        photoRadius: "2mm",
        tagBg: "rgba(15, 118, 110, 0.1)",
        tagText: accent,
      };
    case "engineer":
      return {
        accent,
        paperBg: "#ffffff",
        text: "#111827",
        muted: "#374151",
        headingText: "#111827",
        headingBorder: accent,
        headingBg: "rgba(37, 99, 235, 0.06)",
        headingRadius: "1mm",
        headingPaddingX: "1.8mm",
        headingPaddingY: "0.7mm",
        headerRule: "top",
        photoRadius: "0.75mm",
        tagBg: "rgba(37, 99, 235, 0.1)",
        tagText: accent,
      };
    case "creative":
      return {
        accent,
        paperBg: "#fffdf8",
        text: "#211a16",
        muted: "#5f5047",
        headingText: "#211a16",
        headingBorder: "transparent",
        headingBg: "rgba(180, 83, 9, 0.11)",
        headingRadius: "999px",
        headingPaddingX: "2.2mm",
        headingPaddingY: "0.9mm",
        headerRule: "band",
        photoRadius: "999px",
        tagBg: "rgba(180, 83, 9, 0.12)",
        tagText: accent,
      };
    case "executive":
      return {
        accent,
        paperBg: "#fdfdfb",
        text: "#16181d",
        muted: "#4b5563",
        headingText: "#16181d",
        headingBorder: "rgba(79, 93, 117, 0.72)",
        headingBg: "transparent",
        headingRadius: "0",
        headingPaddingX: "0",
        headingPaddingY: "0",
        headerRule: "top",
        photoRadius: "0",
        tagBg: "rgba(79, 93, 117, 0.1)",
        tagText: accent,
      };
    case "classic":
    default:
      return {
        accent,
        paperBg: "#ffffff",
        text: "#101010",
        muted: "#333333",
        headingText: "#101010",
        headingBorder: "rgba(16, 16, 16, 0.55)",
        headingBg: "transparent",
        headingRadius: "0",
        headingPaddingX: "0",
        headingPaddingY: "0",
        headerRule: "none",
        photoRadius: "0",
        tagBg: "#edf4ff",
        tagText: accent,
      };
  }
}

function getContentStyle(page: PageProfile, visual: TemplateVisual): CSSProperties {
  return {
    "--resume-section-gap": `${page.sectionGap}mm`,
    "--resume-heading-mb": `${page.headingMb}mm`,
    "--resume-heading-pb": `${page.headingPb}mm`,
    "--resume-heading-size": `${page.headingSize}pt`,
    "--resume-heading-border": visual.headingBorder,
    "--resume-heading-bg": visual.headingBg,
    "--resume-heading-fg": visual.headingText,
    "--resume-heading-radius": visual.headingRadius,
    "--resume-heading-px": visual.headingPaddingX,
    "--resume-heading-py": visual.headingPaddingY,
    color: visual.text,
    padding: `${page.padY}mm ${page.padX}mm`,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  } as CSSProperties;
}

function measureLayout(
  measure: HTMLDivElement | null,
  page: PageProfile,
  profileIndex: number,
  blocks: ResumeBlock[]
): MeasuredResumeLayout | null {
  if (!measure) return null;

  const nodes = Array.from(
    measure.querySelectorAll<HTMLElement>("[data-resume-block-id]")
  );

  if (!nodes.length) return null;

  const measuredBlocks = nodes.flatMap((node) => {
    const id = node.dataset.resumeBlockId;
    if (!id) return [];

    const computed = window.getComputedStyle(node);
    const height =
      node.offsetHeight +
      parseFloat(computed.marginTop || "0") +
      parseFloat(computed.marginBottom || "0");

    return [{ id, height }];
  });
  const maxPageHeight = 297 * MM_TO_PX - page.padY * 2 * MM_TO_PX;
  const nextPages: string[][] = [];
  let currentPage: string[] = [];
  let currentHeight = 0;
  let totalHeight = 0;

  for (let index = 0; index < measuredBlocks.length; index += 1) {
    const { id, height } = measuredBlocks[index];
    const wouldOverflow = currentPage.length > 0 && currentHeight + height > maxPageHeight;

    if (wouldOverflow) {
      nextPages.push(currentPage);
      currentPage = [id];
      currentHeight = height;
    } else {
      currentPage.push(id);
      currentHeight += height;
    }

    totalHeight += height;
  }

  if (currentPage.length) {
    nextPages.push(currentPage);
  }

  return {
    profileIndex,
    pageBlockIds: nextPages.length ? nextPages : [blocks.map((block) => block.id)],
    totalHeight,
    maxPageHeight,
  };
}

function fitsOnePage(layout: MeasuredResumeLayout) {
  return layout.pageBlockIds.length <= 1 && layout.totalHeight <= layout.maxPageHeight;
}

export function DefaultTemplate({
  data,
  styleConfig,
  smartOnePage = false,
  onSmartOnePageResult,
}: DefaultTemplateProps) {
  const { metadata, sections } = data;
  const measureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const onePageResultRef = useRef(onSmartOnePageResult);
  const [layout, setLayout] = useState<ResumeLayout>({
    profileIndex: 0,
    pageBlockIds: [],
  });
  useEffect(() => {
    onePageResultRef.current = onSmartOnePageResult;
  }, [onSmartOnePageResult]);

  const basePageCandidate = useMemo(() => createPageCandidate(styleConfig), [styleConfig]);
  // The 22 interpolated smart-one-page candidates are only needed while that
  // mode is active — computing them on every styleConfig change (e.g. every
  // slider drag in the format panel) when smartOnePage is off is wasted work.
  const pageCandidates = useMemo(
    () => (smartOnePage ? createSmartPageCandidates(styleConfig) : [basePageCandidate]),
    [basePageCandidate, smartOnePage, styleConfig]
  );
  const pageProfiles = useMemo(
    () => pageCandidates.map((candidate) => candidate.profile),
    [pageCandidates]
  );
  const introSection = findSection(sections, ["简介", "Profile", "Summary"]);
  const highlightsSection = findSection(sections, ["亮点", "优势", "Highlights"]);
  const skillsSection = findSection(sections, ["技能", "工具", "Skills"]);
  const workSection = findSection(sections, ["工作", "经历", "Experience"]);
  const projectSection = findSection(sections, ["项目", "Projects"]);
  const educationSection = findSection(sections, ["教育", "Education"]);
  const knownSections = [
    introSection,
    highlightsSection,
    skillsSection,
    workSection,
    projectSection,
    educationSection,
  ].filter((section): section is ResumeSection => Boolean(section));
  const extraSections = sections.filter(
    (section) => !knownSections.includes(section) && section.content.trim()
  );
  const primaryRole = workSection?.items?.[0];
  const isZhResume = getResumeFontAudience(metadata.language) === "chinese";
  const roleTitle =
    metadata.tags?.find((tag) => tag.includes("产品")) ||
    metadata.title ||
    primaryRole?.subtitle ||
    (isZhResume ? "AI Agent 产品经理" : "AI Product Manager");
  const availability = metadata.tags?.find((tag) => tag.includes("离职") || tag.includes("到岗"));
  const identityLine = [availability, roleTitle].filter(Boolean).join("  |  ");
  const page = pageProfiles[layout.profileIndex] || pageProfiles[0];
  const blocks = useMemo(
    () =>
      buildResumeBlocks({
        introSection,
        highlightsSection,
        skillsSection,
        workSection,
        projectSection,
        educationSection,
        extraSections,
        primaryRole,
        isZhResume,
      }),
    [
      educationSection,
      extraSections,
      highlightsSection,
      introSection,
      isZhResume,
      primaryRole,
      projectSection,
      skillsSection,
      workSection,
    ]
  );
  const blockById = useMemo(
    () => new Map(blocks.map((block) => [block.id, block])),
    [blocks]
  );
  const pageIds = layout.pageBlockIds.length ? layout.pageBlockIds : [blocks.map((block) => block.id)];
  const fontOption = getResumeFontOption(
    styleConfig.fontId,
    getResumeFontAudience(metadata.language)
  );
  const pageStyle = getPageStyle(page, fontOption.family);
  const templateVisual = getTemplateVisual(styleConfig);
  const contentStyle = getContentStyle(page, templateVisual);

  useLayoutEffect(() => {
    const measuredLayouts = pageProfiles
      .map((profile, index) =>
        measureLayout(measureRefs.current[index], profile, index, blocks)
      )
      .filter((item): item is MeasuredResumeLayout => Boolean(item));

    if (!measuredLayouts.length) {
      setLayout((previous) =>
        previous.profileIndex !== 0 || previous.pageBlockIds.length
          ? { profileIndex: 0, pageBlockIds: [] }
          : previous
      );
      return;
    }

    const selectedLayout = smartOnePage
      ? measuredLayouts.find((item) => fitsOnePage(item)) || measuredLayouts[measuredLayouts.length - 1]
      : measuredLayouts[0];
    const nextLayout: ResumeLayout = {
      profileIndex: selectedLayout.profileIndex,
      pageBlockIds: selectedLayout.pageBlockIds.length
        ? selectedLayout.pageBlockIds
        : [blocks.map((block) => block.id)],
    };

    setLayout((previous) =>
      sameLayout(previous, nextLayout) ? previous : nextLayout
    );

    if (smartOnePage) {
      onePageResultRef.current?.({
        fittedOnePage: fitsOnePage(selectedLayout),
      });
    }
  }, [blockById, blocks, pageCandidates, pageProfiles, smartOnePage, styleConfig]);

  return (
    <>
      {pageProfiles.map((profile, index) => (
        <div
          key={`measure-profile-${index}`}
          ref={(node) => {
            measureRefs.current[index] = node;
          }}
          aria-hidden="true"
          className="no-print pointer-events-none fixed left-[-10000px] top-0 opacity-0"
          style={{ ...getPageStyle(profile, fontOption.family), width: "210mm" }}
        >
          <div style={getContentStyle(profile, templateVisual)}>
            {blocks.map((block) => (
              <ResumeBlockView
                key={`measure-${index}-${block.id}`}
                block={block}
                metadata={metadata}
                identityLine={identityLine}
                themeColor={styleConfig.themeColor}
                page={profile}
                visual={templateVisual}
                measuring
              />
            ))}
          </div>
        </div>
      ))}

      <div
        className="resume-pages mx-auto flex items-start"
        style={{ gap: `${PAGE_GAP_MM}mm` }}
      >
        {pageIds.map((ids, pageIndex) => (
          <article
            key={`page-${pageIndex}`}
            className="resume-paper recruiter-resume h-[297mm] w-[210mm] overflow-hidden bg-white text-[#101010]"
            style={{ ...pageStyle, backgroundColor: templateVisual.paperBg, color: templateVisual.text }}
          >
            <div style={contentStyle}>
              {ids.map((id) => {
                const block = blockById.get(id);
                if (!block) return null;

                return (
                  <ResumeBlockView
                    key={id}
                    block={block}
                    metadata={metadata}
                    identityLine={identityLine}
                    themeColor={styleConfig.themeColor}
                    page={page}
                    visual={templateVisual}
                  />
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function buildResumeBlocks({
  introSection,
  highlightsSection,
  skillsSection,
  workSection,
  projectSection,
  educationSection,
  extraSections,
  primaryRole,
  isZhResume,
}: {
  introSection?: ResumeSection;
  highlightsSection?: ResumeSection;
  skillsSection?: ResumeSection;
  workSection?: ResumeSection;
  projectSection?: ResumeSection;
  educationSection?: ResumeSection;
  extraSections: ResumeSection[];
  primaryRole?: ResumeSectionItem;
  isZhResume: boolean;
}) {
  const blocks: ResumeBlock[] = [{ id: "resume-header", kind: "header" }];

  blocks.push({
    id: "section-intro",
    kind: "paragraph",
    title: isZhResume ? "个人简介" : "Summary",
    text: introSection
      ? sectionToPlainText(introSection)
      : buildRecruiterSummary(primaryRole, isZhResume),
    intro: true,
  });

  if (highlightsSection) {
    appendBulletLines(blocks, highlightsSection.title, sectionBullets(highlightsSection), `section-${highlightsSection.id}`, true);
  }

  if (skillsSection) {
    appendBulletLines(blocks, skillsSection.title, sectionBullets(skillsSection), `section-${skillsSection.id}`, true);
  }

  appendItemBlocks(blocks, workSection, "work-item", "work");
  appendItemBlocks(blocks, projectSection, "work-item", "project");

  for (const section of extraSections) {
    const bullets = markdownBullets(section.content);

    if (bullets.length) {
      appendBulletLines(blocks, section.title, bullets, `section-${section.id}`, true);
      continue;
    }

    blocks.push({
      id: `section-${section.id}`,
      kind: "generic",
      section,
    });
  }

  appendItemBlocks(blocks, educationSection, "education-item", "education");

  return blocks.filter((block) => {
    if (block.kind === "paragraph") return Boolean(block.text.trim());
    if (block.kind === "bullet-line") return Boolean(block.text.trim());
    return true;
  });
}

function appendBulletLines(
  blocks: ResumeBlock[],
  title: string,
  bullets: string[],
  namespace: string,
  dense?: boolean
) {
  bullets.filter(Boolean).forEach((bullet, index, list) => {
    blocks.push({
      id: `${namespace}-bullet-${index}`,
      kind: "bullet-line",
      title: index === 0 ? title : undefined,
      text: bullet,
      dense,
      first: index === 0,
      after: index === list.length - 1 ? "section" : "bullet",
    });
  });
}

function appendItemBlocks(
  blocks: ResumeBlock[],
  section: ResumeSection | undefined,
  kind: "work-item" | "education-item",
  namespace: string
) {
  if (!section) return;

  if (!section.items?.length) {
    blocks.push({
      id: `section-${section.id}`,
      kind: "generic",
      section,
    });
    return;
  }

  section.items.forEach((item, index) => {
    const bullets = item.bullets || [];
    blocks.push({
      id: `${namespace}-${index}-item`,
      kind,
      title: section.title,
      item,
      showHeading: index === 0,
      isLastInSection: index === section.items!.length - 1,
      hasBullets: bullets.length > 0,
    });

    bullets.forEach((bullet, bulletIndex) => {
      const isLastBullet = bulletIndex === bullets.length - 1;
      blocks.push({
        id: `${namespace}-${index}-bullet-${bulletIndex}`,
        kind: "bullet-line",
        text: bullet,
        first: bulletIndex === 0,
        after: isLastBullet
          ? index === section.items!.length - 1
            ? "section"
            : "item"
          : "bullet",
      });
    });
  });
}

function ResumeBlockView({
  block,
  metadata,
  identityLine,
  themeColor,
  page,
  visual,
  measuring,
}: {
  block: ResumeBlock;
  metadata: ResumeData["metadata"];
  identityLine: string;
  themeColor: string;
  page: PageProfile;
  visual: TemplateVisual;
  measuring?: boolean;
}) {
  const dataProps = measuring ? { "data-resume-block-id": block.id } : {};

  switch (block.kind) {
    case "header":
      return (
        <div {...dataProps} style={{ marginBottom: `${page.headerMb}mm` }}>
          <HeaderBlock metadata={metadata} identityLine={identityLine} page={page} visual={visual} />
        </div>
      );
    case "paragraph":
      return (
        <div {...dataProps} style={{ marginBottom: `${page.sectionGap}mm` }}>
          <ResumeSectionBlock title={block.title}>
            <p
              style={{
                fontSize: `${block.intro ? page.intro : page.body}pt`,
                lineHeight: block.intro ? page.introLine : page.bodyLine,
                color: visual.text,
              }}
            >
              {block.text}
            </p>
          </ResumeSectionBlock>
        </div>
      );
    case "bullet-line":
      return (
        <div
          {...dataProps}
          style={{ marginBottom: `${blockGap(block.after, page, block.dense)}mm` }}
        >
          {block.title && <SectionHeading title={block.title} />}
          <BulletLine
            text={block.text}
            themeColor={themeColor}
            page={page}
            visual={visual}
            first={block.first}
          />
        </div>
      );
    case "work-item":
      return (
        <div
          {...dataProps}
          style={{
            marginBottom: block.hasBullets
              ? `${page.bulletMt}mm`
              : `${block.isLastInSection ? page.sectionGap : page.itemGap}mm`,
          }}
        >
          {block.showHeading && <SectionHeading title={block.title} />}
          <WorkItem item={block.item} themeColor={themeColor} page={page} visual={visual} showBullets={false} />
        </div>
      );
    case "education-item":
      return (
        <div
          {...dataProps}
          style={{
            marginBottom: block.hasBullets
              ? `${page.bulletMt}mm`
              : `${block.isLastInSection ? 0 : page.itemGap}mm`,
          }}
        >
          {block.showHeading && <SectionHeading title={block.title} />}
          <EducationItem item={block.item} themeColor={themeColor} page={page} visual={visual} showBullets={false} />
        </div>
      );
    case "generic":
      return (
        <div {...dataProps} style={{ marginBottom: `${page.sectionGap}mm` }}>
          <ResumeSectionBlock title={block.section.title}>
            <GenericSectionContent section={block.section} themeColor={themeColor} page={page} visual={visual} />
          </ResumeSectionBlock>
        </div>
      );
    default:
      return null;
  }
}

function HeaderBlock({
  metadata,
  identityLine,
  page,
  visual,
}: {
  metadata: ResumeData["metadata"];
  identityLine: string;
  page: PageProfile;
  visual: TemplateVisual;
}) {
  return (
    <header
      className="relative text-left"
      style={{
        minHeight: `${page.headerMin}mm`,
        paddingLeft: visual.headerRule === "left" ? "4mm" : undefined,
        paddingTop: visual.headerRule === "top" ? "3mm" : undefined,
        borderTop: visual.headerRule === "top" ? `1.2mm solid ${visual.accent}` : undefined,
        background:
          visual.headerRule === "band"
            ? `linear-gradient(90deg, ${visual.accent}16, transparent 58%)`
            : undefined,
      }}
    >
      {visual.headerRule === "left" && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-[1.1mm]"
          style={{ backgroundColor: visual.accent }}
        />
      )}
      {metadata.photo && (
        <img
          src={metadata.photo}
          alt={metadata.name}
          className="absolute right-0 top-0 object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          style={{
            width: `${page.photoW}mm`,
            height: `${page.photoH}mm`,
            borderRadius: visual.photoRadius,
          }}
        />
      )}

      <div
        className="max-w-[142mm]"
        style={{
          paddingTop: `${page.headerPt}mm`,
          paddingRight: metadata.photo ? `${page.photoW + 8}mm` : undefined,
        }}
      >
        <h1 className="font-semibold leading-none" style={{ fontSize: `${page.name}pt`, color: visual.text }}>
          {metadata.name}
        </h1>
        <div
          style={{
            marginTop: `${Math.max(1.4, page.headerMb / 2.1)}mm`,
            fontSize: `${page.meta}pt`,
            lineHeight: 1.36,
            color: visual.muted,
          }}
        >
          {joinInline([metadata.phone, metadata.email, metadata.location])}
        </div>
        {identityLine && (
          <div
            style={{
              marginTop: `${Math.max(0.8, page.headerMb / 4.2)}mm`,
              fontSize: `${page.meta}pt`,
              lineHeight: 1.36,
              color: visual.muted,
            }}
          >
            {identityLine}
          </div>
        )}
      </div>
    </header>
  );
}

function ResumeSectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <SectionHeading title={title} />
      {children}
    </section>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2
      className="border-b font-semibold leading-tight"
      style={{
        marginBottom: "var(--resume-heading-mb)",
        padding: "var(--resume-heading-py) var(--resume-heading-px) var(--resume-heading-pb)",
        fontSize: "var(--resume-heading-size)",
        borderColor: "var(--resume-heading-border)",
        background: "var(--resume-heading-bg)",
        borderRadius: "var(--resume-heading-radius)",
        color: "var(--resume-heading-fg)",
      }}
    >
      {title}
    </h2>
  );
}

function WorkItem({
  item,
  themeColor,
  page,
  visual,
  showBullets = true,
}: {
  item: ResumeSectionItem;
  themeColor: string;
  page: PageProfile;
  visual: TemplateVisual;
  showBullets?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-8">
        <h3
          className="font-semibold leading-snug"
          style={{ fontSize: `${page.title}pt`, color: visual.text }}
        >
          {item.title}
        </h3>
        {item.date && (
          <span
            className="shrink-0 leading-snug"
            style={{ fontSize: `${page.body}pt`, color: visual.muted }}
          >
            {item.date}
          </span>
        )}
      </div>

      {(item.subtitle || item.location) && (
        <div
          className="flex items-baseline justify-between gap-8"
          style={{
            marginTop: `${page.bulletMt}mm`,
            fontSize: `${page.body}pt`,
            color: visual.muted,
          }}
        >
          {item.subtitle && <span>{item.subtitle}</span>}
          {item.location && <span className="shrink-0">{item.location}</span>}
        </div>
      )}

      {item.description && (
        <p
          style={{
            marginTop: `${page.bulletMt}mm`,
            fontSize: `${page.body}pt`,
            lineHeight: page.bodyLine,
            color: visual.text,
          }}
          dangerouslySetInnerHTML={{
            __html: formatInline(item.description, themeColor),
          }}
        />
      )}

      {showBullets && item.bullets && item.bullets.length > 0 && (
        <BulletList bullets={item.bullets} themeColor={themeColor} page={page} visual={visual} />
      )}
    </div>
  );
}

function GenericSectionContent({
  section,
  themeColor,
  page,
  visual,
}: {
  section: ResumeSection;
  themeColor: string;
  page: PageProfile;
  visual: TemplateVisual;
}) {
  const bullets = markdownBullets(section.content);

  if (bullets.length) {
    return <BulletList bullets={bullets} themeColor={themeColor} page={page} visual={visual} dense />;
  }

  const text = sectionToPlainText(section);
  if (!text) return null;

  return (
    <p
      style={{
        fontSize: `${page.body}pt`,
        lineHeight: page.bodyLine,
        color: visual.text,
      }}
      dangerouslySetInnerHTML={{
        __html: formatInline(text, themeColor),
      }}
    />
  );
}

function EducationItem({
  item,
  themeColor,
  page,
  visual,
  showBullets = true,
}: {
  item: ResumeSectionItem;
  themeColor: string;
  page: PageProfile;
  visual: TemplateVisual;
  showBullets?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-8">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className="font-semibold"
            style={{ fontSize: `${page.title}pt`, color: visual.text }}
          >
            {item.title}
          </h3>
          {item.tags?.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="rounded-sm px-1.5 py-0.5 text-[8pt] leading-none"
              style={{ backgroundColor: visual.tagBg, color: visual.tagText }}
            >
              {tag}
            </span>
          ))}
        </div>
        {item.date && (
          <span
            className="shrink-0"
            style={{ fontSize: `${page.body}pt`, color: visual.muted }}
          >
            {item.date}
          </span>
        )}
      </div>

      {(item.subtitle || item.location) && (
        <div
          className="flex items-baseline justify-between gap-8"
          style={{
            marginTop: `${page.bulletMt}mm`,
            fontSize: `${page.body}pt`,
            color: visual.muted,
          }}
        >
          {item.subtitle && <span>{item.subtitle}</span>}
          {item.location && <span className="shrink-0">{item.location}</span>}
        </div>
      )}

      {showBullets && item.bullets && item.bullets.length > 0 && (
        <BulletList bullets={item.bullets} themeColor={themeColor} page={page} visual={visual} dense />
      )}
    </div>
  );
}

function BulletLine({
  text,
  themeColor,
  page,
  visual,
  first,
}: {
  text: string;
  themeColor: string;
  page: PageProfile;
  visual: TemplateVisual;
  first?: boolean;
}) {
  return (
    <ul
      className="pl-4"
      style={{
        listStyleType: "disc",
        marginTop: first ? `${page.bulletMt}mm` : 0,
        marginBottom: "0",
        fontSize: `${page.body}pt`,
        lineHeight: page.bodyLine,
        color: visual.text,
      }}
    >
      <li
        className="pl-1"
        dangerouslySetInnerHTML={{
          __html: formatInline(text, themeColor),
        }}
      />
    </ul>
  );
}

function BulletList({
  bullets,
  themeColor,
  page,
  visual,
  dense,
}: {
  bullets: string[];
  themeColor: string;
  page: PageProfile;
  visual: TemplateVisual;
  dense?: boolean;
}) {
  if (!bullets.length) return null;

  return (
    <ul
      className="pl-4"
      style={{
        listStyleType: "disc",
        marginTop: `${page.bulletMt}mm`,
        marginBottom: "0",
        fontSize: `${page.body}pt`,
        lineHeight: page.bodyLine,
        color: visual.text,
      }}
    >
      {bullets.map((bullet, index) => (
        <li
          key={`${bullet}-${index}`}
          className="pl-1"
          style={{
            marginBottom:
              index === bullets.length - 1
                ? "0"
                : `${dense ? Math.max(0, page.bulletGap - 0.45) : page.bulletGap}mm`,
          }}
          dangerouslySetInnerHTML={{
            __html: formatInline(bullet, themeColor),
          }}
        />
      ))}
    </ul>
  );
}

function blockGap(
  after: "bullet" | "item" | "section",
  page: PageProfile,
  dense?: boolean
) {
  if (after === "section") return page.sectionGap;
  if (after === "item") return page.itemGap;
  return dense ? Math.max(0, page.bulletGap - 0.45) : page.bulletGap;
}

function findSection(sections: ResumeData["sections"], keywords: string[]) {
  return sections.find((section) =>
    keywords.some((keyword) => section.title.toLowerCase().includes(keyword.toLowerCase()))
  );
}

function sectionBullets(section: ResumeSection) {
  if (section.items?.length) {
    return section.items.flatMap((item) => item.bullets || []);
  }

  const bullets = markdownBullets(section.content);

  return bullets.length
    ? bullets
    : section.content
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

function markdownBullets(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .filter(Boolean);
}

function sectionToPlainText(section: ResumeSection) {
  if (section.items?.length) {
    return section.items
      .flatMap((item) => [item.description, ...(item.bullets || [])])
      .filter(Boolean)
      .map((line) => stripMarkdown(line || ""))
      .join(" ");
  }

  return section.content
    .split("\n")
    .map((line) => stripMarkdown(line.trim().replace(/^[-*]\s+/, "")))
    .filter(Boolean)
    .join(" ");
}

function buildRecruiterSummary(item: ResumeSectionItem | undefined, isZhResume: boolean) {
  if (item?.description) {
    return isZhResume
      ? "7 年互联网产品经验，近 3 年专注 AI Agent、RAG 与 AI Workflow 系统设计，具备 AI SaaS 产品与 B 端 AI 场景的完整落地经验。熟悉 Prompt Engineering、Context Engineering、Tool Calling、Memory 管理、多 Agent 协作与 Agent Evaluation，能够独立推进 AI 系统从需求分析、工作流设计到验证优化的完整闭环。"
      : "7 years of product experience, with the last 3 focused on AI Agent, RAG, and AI workflow system design, covering end-to-end delivery for AI SaaS and enterprise AI scenarios. Familiar with prompt engineering, context engineering, tool calling, memory management, multi-agent collaboration, and agent evaluation, able to drive AI systems from discovery and workflow design through validation and optimization.";
  }

  return isZhResume
    ? "面向 AI 时代的产品经理，关注 AI Agent、RAG、工作流编排与结构化知识系统，擅长将复杂技术能力转化为清晰、可信、可验证的产品体验。"
    : "Product manager for the AI era, focused on AI agents, RAG, workflow orchestration, and structured knowledge systems, skilled at turning complex technical capabilities into clear, trustworthy, verifiable product experiences.";
}

function joinInline(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join("  |  ");
}

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

function formatInline(text: string, themeColor: string): string {
  const safeThemeColor = isSafeHexColor(themeColor) ? themeColor : "#1a56db";
  const escaped = escapeHtml(text);

  return escaped
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong style="font-weight: 650; color: #111">$1</strong>'
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      const safeHref = sanitizeLinkHref(href);
      if (!safeHref) return label;

      return `<a href="${safeHref}" style="color: ${safeThemeColor}; text-decoration: underline" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeLinkHref(href: string) {
  const value = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(value)) return escapeHtml(value);

  return "";
}

function isSafeHexColor(value: string) {
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value);
}

function samePages(a: string[][], b: string[][]) {
  if (a.length !== b.length) return false;

  return a.every((page, pageIndex) => {
    const nextPage = b[pageIndex];
    return page.length === nextPage.length && page.every((id, idIndex) => id === nextPage[idIndex]);
  });
}

function sameLayout(a: ResumeLayout, b: ResumeLayout) {
  return a.profileIndex === b.profileIndex && samePages(a.pageBlockIds, b.pageBlockIds);
}
