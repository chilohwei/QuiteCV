// Resume data types
export interface ResumeMetadata {
  name: string;
  title?: string;
  location?: string;
  email?: string;
  phone?: string;
  photo?: string;
  logo?: string;
  language?: string;
  tags?: string[];
}

export interface ResumeSection {
  id: string;
  title: string;
  content: string;
  items?: ResumeSectionItem[];
}

export interface ResumeSectionItem {
  title?: string;
  subtitle?: string;
  date?: string;
  location?: string;
  description?: string;
  bullets?: string[];
  tags?: string[];
}

export interface ResumeData {
  metadata: ResumeMetadata;
  sections: ResumeSection[];
  rawContent: string;
}

// Style configuration types
export interface ResumeStyleConfig {
  themeColor: string;     // hex color
  templateId: ResumeTemplateId;
  fontId: ResumeFontId;
  fontSize: number;       // pt
  lineHeight: number;     // unitless
  pagePadding: number;    // mm
  sectionSpacing: number; // multiplier
}

export type ResumeTemplateId = "classic" | "product" | "engineer" | "creative" | "executive";
export type ResumeFontId = "noto-sans-sc" | "noto-serif-sc" | "noto-sans" | "noto-serif" | "noto-sans-mono";
export type ResumeFontAudience = "chinese" | "overseas";

export const DEFAULT_STYLE_CONFIG: ResumeStyleConfig = {
  themeColor: "#1a56db",
  templateId: "classic",
  fontId: "noto-sans-sc",
  fontSize: 10,
  lineHeight: 1.56,
  pagePadding: 15,
  sectionSpacing: 1,
};

export const RESUME_FONT_OPTIONS: Array<{
  id: ResumeFontId;
  family: string;
  audiences: ResumeFontAudience[];
  labels: Record<ResumeFontAudience, {
    name: string;
    shortName: string;
    description: string;
  }>;
}> = [
  {
    id: "noto-sans-sc",
    family: "'Noto Sans SC', 'Noto Sans', sans-serif",
    audiences: ["chinese"],
    labels: {
      chinese: {
        name: "思源黑体",
        shortName: "黑体",
        description: "默认中文简历，清晰克制，适合产品、技术、运营岗位。",
      },
      overseas: {
        name: "Noto Sans SC Fallback",
        shortName: "Sans",
        description: "CJK fallback used when mixed Chinese text appears in overseas resumes.",
      },
    },
  },
  {
    id: "noto-serif-sc",
    family: "'Noto Serif SC', 'Noto Serif', serif",
    audiences: ["chinese"],
    labels: {
      chinese: {
        name: "思源宋体",
        shortName: "宋体",
        description: "更正式的书面气质，适合顾问、管理、研究型简历。",
      },
      overseas: {
        name: "Noto Serif SC Fallback",
        shortName: "Serif",
        description: "CJK serif fallback used when mixed Chinese text appears in overseas resumes.",
      },
    },
  },
  {
    id: "noto-sans",
    family: "'Noto Sans', 'Noto Sans SC', sans-serif",
    audiences: ["overseas"],
    labels: {
      chinese: {
        name: "Noto Sans",
        shortName: "Sans",
        description: "适合英文与多语言简历的开源无衬线字体。",
      },
      overseas: {
        name: "Noto Sans",
        shortName: "Sans",
        description: "Clean open-source sans-serif for international resumes.",
      },
    },
  },
  {
    id: "noto-serif",
    family: "'Noto Serif', 'Noto Serif SC', serif",
    audiences: ["overseas"],
    labels: {
      chinese: {
        name: "Noto Serif",
        shortName: "Serif",
        description: "适合英文正式简历的开源衬线字体。",
      },
      overseas: {
        name: "Noto Serif",
        shortName: "Serif",
        description: "Formal open-source serif for executive, research, and advisory resumes.",
      },
    },
  },
  {
    id: "noto-sans-mono",
    family: "'Noto Sans Mono', 'Noto Sans', 'Noto Sans SC', monospace",
    audiences: ["overseas"],
    labels: {
      chinese: {
        name: "等宽字体",
        shortName: "等宽",
        description: "适合代码片段、命令和技术栈密集内容。",
      },
      overseas: {
        name: "Noto Sans Mono",
        shortName: "Mono",
        description: "Monospace option for engineering resumes and technical content.",
      },
    },
  },
];

export function getResumeFontAudience(language: string | undefined): ResumeFontAudience {
  return normalizeResumeLanguage(language).startsWith("zh") ? "chinese" : "overseas";
}

export function getResumeFontOptionsForAudience(audience: ResumeFontAudience) {
  return RESUME_FONT_OPTIONS
    .filter((font) => font.audiences.includes(audience))
    .map((font) => ({
      id: font.id,
      family: font.family,
      ...font.labels[audience],
    }));
}

export function getResumeFontOption(fontId: ResumeFontId, audience: ResumeFontAudience = "chinese") {
  const options = getResumeFontOptionsForAudience(audience);
  return options.find((font) => font.id === fontId) || options[0] || getResumeFontOptionsForAudience("chinese")[0];
}

function normalizeResumeLanguage(language: string | undefined) {
  return (language || "zh-CN").trim().replace(/_/g, "-").toLowerCase();
}

export const RESUME_TEMPLATE_OPTIONS: Array<{
  id: ResumeTemplateId;
  name: string;
  description: string;
  audience: string;
  accentColor: string;
}> = [
  {
    id: "classic",
    name: "经典招聘",
    description: "克制、清晰、适合 ATS 与招聘经理快速扫读。",
    audience: "通用岗位 / 产品 / 运营",
    accentColor: "#1a56db",
  },
  {
    id: "product",
    name: "产品增长",
    description: "强调业务结果、跨团队协作与指标表达。",
    audience: "产品经理 / 增长 / 咨询",
    accentColor: "#0f766e",
  },
  {
    id: "engineer",
    name: "技术工程",
    description: "信息密度更高，突出项目、系统与技术栈。",
    audience: "工程师 / 数据 / AI",
    accentColor: "#2563eb",
  },
  {
    id: "creative",
    name: "设计创意",
    description: "更有视觉识别度，适合作品集导向的经历呈现。",
    audience: "设计 / 品牌 / 内容",
    accentColor: "#b45309",
  },
  {
    id: "executive",
    name: "高管顾问",
    description: "稳重、留白更强，突出战略、管理与行业影响。",
    audience: "管理 / 咨询 / 投融资",
    accentColor: "#4f5d75",
  },
];
