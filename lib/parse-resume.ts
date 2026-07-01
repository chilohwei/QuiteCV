import matter from "gray-matter";
import type { ResumeData, ResumeMetadata, ResumeSection } from "@/types/resume";

interface LocalizedMarkdownBlock {
  language: string;
  content: string;
}

export function parseResumeMarkdown(
  markdown: string,
  preferredLanguages: string[] = []
): ResumeData {
  const localizedMarkdown = selectLocalizedMarkdown(markdown, preferredLanguages);
  const { data, content } = matter(localizedMarkdown.content);

  const metadata: ResumeMetadata = {
    name: data.name || "Your Name",
    title: data.title,
    location: data.location,
    email: data.email,
    phone: data.phone,
    photo: data.photo,
    logo: data.logo,
    language: data.language || localizedMarkdown.language || "zh-CN",
    tags: data.tags || [],
  };

  const sections = parseSections(content);

  return {
    metadata,
    sections,
    rawContent: content,
  };
}

function selectLocalizedMarkdown(markdown: string, preferredLanguages: string[]) {
  const localizedBlocks = extractLocalizedMarkdownBlocks(markdown);

  if (!localizedBlocks.length) {
    return {
      language: "",
      content: markdown,
    };
  }

  const normalizedPreferredLanguages = preferredLanguages
    .map(normalizeLanguageTag)
    .filter(Boolean);
  const selectedBlock = localizedBlocks
    .map((block) => ({
      block,
      score: getLanguageMatchScore(block.language, normalizedPreferredLanguages),
    }))
    .sort((a, b) => b.score - a.score)[0]?.block || localizedBlocks[0];

  return selectedBlock;
}

function extractLocalizedMarkdownBlocks(markdown: string): LocalizedMarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: LocalizedMarkdownBlock[] = [];
  let activeLanguage = "";
  let activeContent: string[] = [];

  for (const line of lines) {
    const startMatch = line.match(
      /^<!--\s*(?:resume[-\s])?language\s*:\s*([a-z]{2,3}(?:[-_][a-z0-9]{2,8})*)\s*-->\s*$/i
    );
    const endMatch = line.match(/^<!--\s*\/(?:resume[-\s])?language\s*-->\s*$/i);

    if (startMatch) {
      if (activeLanguage && activeContent.length) {
        blocks.push({
          language: normalizeLanguageTag(activeLanguage),
          content: activeContent.join("\n").trim(),
        });
      }

      activeLanguage = startMatch[1];
      activeContent = [];
      continue;
    }

    if (endMatch) {
      if (activeLanguage) {
        blocks.push({
          language: normalizeLanguageTag(activeLanguage),
          content: activeContent.join("\n").trim(),
        });
      }

      activeLanguage = "";
      activeContent = [];
      continue;
    }

    if (activeLanguage) {
      activeContent.push(line);
    }
  }

  if (activeLanguage && activeContent.length) {
    blocks.push({
      language: normalizeLanguageTag(activeLanguage),
      content: activeContent.join("\n").trim(),
    });
  }

  return blocks.filter((block) => block.language && block.content);
}

function getLanguageMatchScore(language: string, preferredLanguages: string[]) {
  const normalizedLanguage = normalizeLanguageTag(language);
  const languageBase = getLanguageBase(normalizedLanguage);
  let bestScore = 0;

  preferredLanguages.forEach((preferredLanguage, index) => {
    const preferredBase = getLanguageBase(preferredLanguage);
    const orderBonus = Math.max(0, 10 - index);
    let score = 0;

    if (preferredLanguage === normalizedLanguage) {
      score = 100;
    } else if (preferredBase && preferredBase === languageBase) {
      score = 80;
    } else if (preferredBase === "zh" && languageBase === "zh") {
      score = 70;
    }

    bestScore = Math.max(bestScore, score + orderBonus);
  });

  return bestScore;
}

function normalizeLanguageTag(language: string) {
  return language.trim().replace(/_/g, "-").toLowerCase();
}

function getLanguageBase(language: string) {
  return normalizeLanguageTag(language).split("-")[0] || "";
}

function parseSections(content: string): ResumeSection[] {
  const sections: ResumeSection[] = [];
  const lines = content.split("\n");

  let currentSection: ResumeSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for H1 or H2 headers as section starts
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);

    if (h1Match || h2Match) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join("\n").trim();
        currentSection.items = parseItems(currentSection.content);
        sections.push(currentSection);
      }

      const title = h1Match ? h1Match[1] : h2Match![1];
      currentSection = {
        id: generateId(title),
        title: title.trim(),
        content: "",
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join("\n").trim();
    currentSection.items = parseItems(currentSection.content);
    sections.push(currentSection);
  }

  return sections;
}

function parseItems(content: string): ResumeSection["items"] {
  const items: ResumeSection["items"] = [];
  const blocks = content.split(/\n(?=###\s)/);

  for (const block of blocks) {
    const lines = block.split("\n");
    const headerMatch = lines[0]?.match(/^###\s+(.+)$/);

    if (headerMatch) {
      const item: NonNullable<ResumeSection["items"]>[0] = {
        title: headerMatch[1],
      };

      const restContent = lines.slice(1).join("\n").trim();

      // Parse bold subtitle line: **subtitle**
      const boldSubtitleMatch = restContent.match(/^\*\*(.+)\*\*$/m);
      if (boldSubtitleMatch) {
        item.subtitle = boldSubtitleMatch[1];
      }

      // Parse metadata line (date | location)
      const metaMatch = restContent.match(/^\*([^*]+)\*$/m);
      if (metaMatch) {
        const metaParts = metaMatch[1].split("|").map((p) => p.trim());
        if (metaParts.length >= 1) item.date = metaParts[0];
        if (metaParts.length >= 2) item.location = metaParts[1];
      }

      // Parse tags like [211] [双一流]
      const tagMatches = restContent.matchAll(/\[([^\]]+)\]/g);
      const tags: string[] = [];
      for (const match of tagMatches) {
        // Exclude markdown links [text](url)
        const afterBracket = restContent.substring(
          restContent.indexOf(match[0]) + match[0].length
        );
        if (!afterBracket.startsWith("(")) {
          tags.push(match[1]);
        }
      }
      if (tags.length > 0) {
        item.tags = tags;
      }

      // Parse bullets
      const bullets: string[] = [];
      const bulletMatches = restContent.matchAll(/^[-*]\s+(.+)$/gm);
      for (const match of bulletMatches) {
        bullets.push(match[1]);
      }
      if (bullets.length > 0) {
        item.bullets = bullets;
      }

      // Parse description (paragraphs that are not bullets, meta, or headers)
      const descLines = restContent
        .split("\n")
        .filter((line) => {
          return (
            !line.match(/^\*[^*]+\*$/) && // not italics meta
            !line.match(/^\*\*.+\*\*$/) && // not bold subtitle
            !line.match(/^[-*]\s+/) && // not bullet
            !line.match(/^###/) && // not header
            !line.match(/^\[.+\]$/) && // not standalone tags
            !line.match(/^\[.+\]\s*\[.+\]/) && // not multiple tags
            line.trim() &&
            !line.trim().match(/^\[.+\](\s+\[.+\])*$/) // not only tags
          );
        })
        .join("\n")
        .trim();

      if (descLines) {
        item.description = descLines;
      }

      items.push(item);
    }
  }

  return items.length > 0 ? items : undefined;
}

function generateId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
