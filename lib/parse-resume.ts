import matter from "gray-matter";
import type { ResumeData, ResumeMetadata, ResumeSection } from "@/types/resume";

export function parseResumeMarkdown(markdown: string): ResumeData {
  const { data, content } = matter(markdown);

  const metadata: ResumeMetadata = {
    name: data.name || "Your Name",
    title: data.title,
    location: data.location,
    email: data.email,
    phone: data.phone,
    photo: data.photo,
    logo: data.logo,
    language: data.language || "zh-CN",
    tags: data.tags || [],
  };

  const sections = parseSections(content);

  return {
    metadata,
    sections,
    rawContent: content,
  };
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
