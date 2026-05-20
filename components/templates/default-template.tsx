"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ResumeData, ResumeSection, ResumeSectionItem, ResumeStyleConfig } from "@/types/resume";
import { FONT_OPTIONS } from "@/types/resume";

interface DefaultTemplateProps {
  data: ResumeData;
  styleConfig: ResumeStyleConfig;
}

const MM_TO_PX = 3.7795;
const PAGE_GAP_MM = 8;

const PAGE_PROFILE = {
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

type PageProfile = typeof PAGE_PROFILE;

type ResumeBlock =
  | { id: string; kind: "header" }
  | { id: string; kind: "paragraph"; title: string; text: string; intro?: boolean }
  | { id: string; kind: "bullet-line"; title?: string; text: string; dense?: boolean; first: boolean; after: "bullet" | "item" | "section" }
  | { id: string; kind: "work-item"; title: string; item: ResumeSectionItem; showHeading: boolean; isLastInSection: boolean; hasBullets: boolean }
  | { id: string; kind: "education-item"; title: string; item: ResumeSectionItem; showHeading: boolean; isLastInSection: boolean; hasBullets: boolean }
  | { id: string; kind: "generic"; section: ResumeSection };

export function DefaultTemplate({ data, styleConfig }: DefaultTemplateProps) {
  const { metadata, sections } = data;
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageBlockIds, setPageBlockIds] = useState<string[][]>([]);
  const fontOption = FONT_OPTIONS.find((f) => f.id === styleConfig.fontFamily) || FONT_OPTIONS[0];
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
  const roleTitle = metadata.tags?.find((tag) => tag.includes("产品")) || metadata.title || primaryRole?.subtitle || "AI Agent 产品经理";
  const availability = metadata.tags?.find((tag) => tag.includes("离职") || tag.includes("到岗"));
  const identityLine = [availability, roleTitle].filter(Boolean).join("  |  ");
  const page = PAGE_PROFILE;
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
      }),
    [
      educationSection,
      extraSections,
      highlightsSection,
      introSection,
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
  const pageIds = pageBlockIds.length ? pageBlockIds : [blocks.map((block) => block.id)];
  const fitVariables = {
    "--resume-section-gap": `${page.sectionGap}mm`,
    "--resume-heading-mb": `${page.headingMb}mm`,
    "--resume-heading-pb": `${page.headingPb}mm`,
    "--resume-heading-size": `${page.headingSize}pt`,
  } as CSSProperties;
  const pageStyle = {
    fontFamily: fontOption.family,
    fontSize: `${page.body}pt`,
    lineHeight: page.line,
  } as CSSProperties;
  const contentStyle = {
    ...fitVariables,
    color: "#101010",
    padding: `${page.padY}mm ${page.padX}mm`,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  } as CSSProperties;

  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure) return;

    const nodes = Array.from(
      measure.querySelectorAll<HTMLElement>("[data-resume-block-id]")
    );

    if (!nodes.length) {
      setPageBlockIds([]);
      return;
    }

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

    for (let index = 0; index < measuredBlocks.length; index += 1) {
      const { id, height } = measuredBlocks[index];
      const block = blockById.get(id);
      const sectionHeight = block && startsSection(block)
        ? measureSectionHeight(measuredBlocks, index, blockById)
        : 0;
      const shouldMoveWholeSection =
        currentPage.length > 0 &&
        sectionHeight > 0 &&
        sectionHeight <= maxPageHeight &&
        currentHeight + sectionHeight > maxPageHeight;

      if (shouldMoveWholeSection) {
        nextPages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }

      const wouldOverflow = currentPage.length > 0 && currentHeight + height > maxPageHeight;

      if (wouldOverflow) {
        nextPages.push(currentPage);
        currentPage = [id];
        currentHeight = height;
      } else {
        currentPage.push(id);
        currentHeight += height;
      }
    }

    if (currentPage.length) {
      nextPages.push(currentPage);
    }

    const normalizedPages = nextPages.length ? nextPages : [blocks.map((block) => block.id)];
    setPageBlockIds((previous) =>
      samePages(previous, normalizedPages) ? previous : normalizedPages
    );
  }, [blockById, blocks, page.padY]);

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden="true"
        className="no-print pointer-events-none fixed left-[-10000px] top-0 opacity-0"
        style={{ ...pageStyle, width: "210mm" }}
      >
        <div style={contentStyle}>
          {blocks.map((block) => (
            <ResumeBlockView
              key={`measure-${block.id}`}
              block={block}
              metadata={metadata}
              identityLine={identityLine}
              themeColor={styleConfig.themeColor}
              page={page}
              measuring
            />
          ))}
        </div>
      </div>

      <div
        className="resume-pages mx-auto flex items-start"
        style={{ gap: `${PAGE_GAP_MM}mm` }}
      >
        {pageIds.map((ids, pageIndex) => (
          <article
            key={`page-${pageIndex}`}
            className="resume-paper recruiter-resume h-[297mm] w-[210mm] overflow-hidden bg-white text-[#101010]"
            style={pageStyle}
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
}: {
  introSection?: ResumeSection;
  highlightsSection?: ResumeSection;
  skillsSection?: ResumeSection;
  workSection?: ResumeSection;
  projectSection?: ResumeSection;
  educationSection?: ResumeSection;
  extraSections: ResumeSection[];
  primaryRole?: ResumeSectionItem;
}) {
  const blocks: ResumeBlock[] = [{ id: "resume-header", kind: "header" }];

  blocks.push({
    id: "section-intro",
    kind: "paragraph",
    title: "个人简介",
    text: introSection ? sectionToPlainText(introSection) : buildRecruiterSummary(primaryRole),
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
  measuring,
}: {
  block: ResumeBlock;
  metadata: ResumeData["metadata"];
  identityLine: string;
  themeColor: string;
  page: PageProfile;
  measuring?: boolean;
}) {
  const dataProps = measuring ? { "data-resume-block-id": block.id } : {};

  switch (block.kind) {
    case "header":
      return (
        <div {...dataProps} style={{ marginBottom: `${page.headerMb}mm` }}>
          <HeaderBlock metadata={metadata} identityLine={identityLine} page={page} />
        </div>
      );
    case "paragraph":
      return (
        <div {...dataProps} style={{ marginBottom: `${page.sectionGap}mm` }}>
          <ResumeSectionBlock title={block.title}>
            <p
              className="text-[#202020]"
              style={{
                fontSize: `${block.intro ? page.intro : page.body}pt`,
                lineHeight: block.intro ? page.introLine : page.bodyLine,
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
          <WorkItem item={block.item} themeColor={themeColor} page={page} showBullets={false} />
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
          <EducationItem item={block.item} themeColor={themeColor} page={page} showBullets={false} />
        </div>
      );
    case "generic":
      return (
        <div {...dataProps} style={{ marginBottom: `${page.sectionGap}mm` }}>
          <ResumeSectionBlock title={block.section.title}>
            <GenericSectionContent section={block.section} themeColor={themeColor} page={page} />
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
}: {
  metadata: ResumeData["metadata"];
  identityLine: string;
  page: PageProfile;
}) {
  return (
    <header
      className="relative text-center"
      style={{
        minHeight: `${page.headerMin}mm`,
      }}
    >
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
          }}
        />
      )}

      <div className="mx-auto max-w-[118mm]" style={{ paddingTop: `${page.headerPt}mm` }}>
        <h1 className="font-semibold leading-none" style={{ fontSize: `${page.name}pt` }}>
          {metadata.name}
        </h1>
        <div
          className="text-[#222]"
          style={{
            marginTop: `${Math.max(1.4, page.headerMb / 2.1)}mm`,
            fontSize: `${page.meta}pt`,
            lineHeight: 1.36,
          }}
        >
          {joinInline([metadata.phone, metadata.email, metadata.location])}
        </div>
        {identityLine && (
          <div
            className="text-[#222]"
            style={{
              marginTop: `${Math.max(0.8, page.headerMb / 4.2)}mm`,
              fontSize: `${page.meta}pt`,
              lineHeight: 1.36,
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
        paddingBottom: "var(--resume-heading-pb)",
        fontSize: "var(--resume-heading-size)",
        borderColor: "rgba(16, 16, 16, 0.55)",
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
  showBullets = true,
}: {
  item: ResumeSectionItem;
  themeColor: string;
  page: PageProfile;
  showBullets?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-8">
        <h3
          className="font-semibold leading-snug text-[#111]"
          style={{ fontSize: `${page.title}pt` }}
        >
          {item.title}
        </h3>
        {item.date && (
          <span
            className="shrink-0 leading-snug text-[#222]"
            style={{ fontSize: `${page.body}pt` }}
          >
            {item.date}
          </span>
        )}
      </div>

      {(item.subtitle || item.location) && (
        <div
          className="flex items-baseline justify-between gap-8 text-[#333]"
          style={{
            marginTop: `${page.bulletMt}mm`,
            fontSize: `${page.body}pt`,
          }}
        >
          {item.subtitle && <span>{item.subtitle}</span>}
          {item.location && <span className="shrink-0">{item.location}</span>}
        </div>
      )}

      {item.description && (
        <p
          className="text-[#222]"
          style={{
            marginTop: `${page.bulletMt}mm`,
            fontSize: `${page.body}pt`,
            lineHeight: page.bodyLine,
          }}
          dangerouslySetInnerHTML={{
            __html: formatInline(item.description, themeColor),
          }}
        />
      )}

      {showBullets && item.bullets && item.bullets.length > 0 && (
        <BulletList bullets={item.bullets} themeColor={themeColor} page={page} />
      )}
    </div>
  );
}

function GenericSectionContent({
  section,
  themeColor,
  page,
}: {
  section: ResumeSection;
  themeColor: string;
  page: PageProfile;
}) {
  const bullets = markdownBullets(section.content);

  if (bullets.length) {
    return <BulletList bullets={bullets} themeColor={themeColor} page={page} dense />;
  }

  const text = sectionToPlainText(section);
  if (!text) return null;

  return (
    <p
      className="text-[#222]"
      style={{
        fontSize: `${page.body}pt`,
        lineHeight: page.bodyLine,
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
  showBullets = true,
}: {
  item: ResumeSectionItem;
  themeColor: string;
  page: PageProfile;
  showBullets?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-8">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className="font-semibold text-[#111]"
            style={{ fontSize: `${page.title}pt` }}
          >
            {item.title}
          </h3>
          {item.tags?.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="rounded-sm bg-[#edf4ff] px-1.5 py-0.5 text-[8pt] leading-none text-[#3573c9]"
            >
              {tag}
            </span>
          ))}
        </div>
        {item.date && (
          <span
            className="shrink-0 text-[#222]"
            style={{ fontSize: `${page.body}pt` }}
          >
            {item.date}
          </span>
        )}
      </div>

      {(item.subtitle || item.location) && (
        <div
          className="flex items-baseline justify-between gap-8 text-[#333]"
          style={{
            marginTop: `${page.bulletMt}mm`,
            fontSize: `${page.body}pt`,
          }}
        >
          {item.subtitle && <span>{item.subtitle}</span>}
          {item.location && <span className="shrink-0">{item.location}</span>}
        </div>
      )}

      {showBullets && item.bullets && item.bullets.length > 0 && (
        <BulletList bullets={item.bullets} themeColor={themeColor} page={page} dense />
      )}
    </div>
  );
}

function BulletLine({
  text,
  themeColor,
  page,
  first,
}: {
  text: string;
  themeColor: string;
  page: PageProfile;
  first?: boolean;
}) {
  return (
    <ul
      className="pl-4 text-[#222]"
      style={{
        listStyleType: "disc",
        marginTop: first ? `${page.bulletMt}mm` : 0,
        marginBottom: "0",
        fontSize: `${page.body}pt`,
        lineHeight: page.bodyLine,
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
  dense,
}: {
  bullets: string[];
  themeColor: string;
  page: PageProfile;
  dense?: boolean;
}) {
  if (!bullets.length) return null;

  return (
    <ul
      className="pl-4 text-[#222]"
      style={{
        listStyleType: "disc",
        marginTop: `${page.bulletMt}mm`,
        marginBottom: "0",
        fontSize: `${page.body}pt`,
        lineHeight: page.bodyLine,
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

function startsSection(block: ResumeBlock) {
  if (block.kind === "paragraph" || block.kind === "generic") return true;
  if (block.kind === "bullet-line") return Boolean(block.title);
  if (block.kind === "work-item" || block.kind === "education-item") return block.showHeading;
  return false;
}

function endsSection(block: ResumeBlock) {
  if (block.kind === "header" || block.kind === "paragraph" || block.kind === "generic") return true;
  if (block.kind === "bullet-line") return block.after === "section";
  if (block.kind === "work-item" || block.kind === "education-item") {
    return block.isLastInSection && !block.hasBullets;
  }
  return false;
}

function measureSectionHeight(
  measuredBlocks: Array<{ id: string; height: number }>,
  startIndex: number,
  blockById: Map<string, ResumeBlock>
) {
  let height = 0;

  for (let index = startIndex; index < measuredBlocks.length; index += 1) {
    const measured = measuredBlocks[index];
    const block = blockById.get(measured.id);
    height += measured.height;

    if (block && endsSection(block)) break;
  }

  return height;
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

function buildRecruiterSummary(item?: ResumeSectionItem) {
  if (item?.description) {
    return "7 年互联网产品经验，近 3 年专注 AI Agent、RAG 与 AI Workflow 系统设计，具备 AI SaaS 产品与 B 端 AI 场景的完整落地经验。熟悉 Prompt Engineering、Context Engineering、Tool Calling、Memory 管理、多 Agent 协作与 Agent Evaluation，能够独立推进 AI 系统从需求分析、工作流设计到验证优化的完整闭环。";
  }

  return "面向 AI 时代的产品经理，关注 AI Agent、RAG、工作流编排与结构化知识系统，擅长将复杂技术能力转化为清晰、可信、可验证的产品体验。";
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
  let formatted = text.replace(
    /\*\*(.*?)\*\*/g,
    '<strong style="font-weight: 650; color: #111">$1</strong>'
  );

  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" style="color: ${themeColor}; text-decoration: underline" target="_blank" rel="noopener noreferrer">$1</a>`
  );
  return formatted;
}

function samePages(a: string[][], b: string[][]) {
  if (a.length !== b.length) return false;

  return a.every((page, pageIndex) => {
    const nextPage = b[pageIndex];
    return page.length === nextPage.length && page.every((id, idIndex) => id === nextPage[idIndex]);
  });
}
