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
  fontFamily: string;
  themeColor: string;     // hex color
}

export const DEFAULT_STYLE_CONFIG: ResumeStyleConfig = {
  fontFamily: "microsoft-yahei",
  themeColor: "#1a56db",
};

export const FONT_OPTIONS = [
  { id: "microsoft-yahei", name: "微软雅黑", family: "'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif" },
  { id: "simhei", name: "黑体", family: "'SimHei', 'Heiti SC', 'Noto Sans SC', sans-serif" },
  { id: "simsun", name: "宋体", family: "'SimSun', 'Songti SC', 'Noto Serif SC', serif" },
  { id: "kaiti", name: "楷体", family: "'KaiTi', 'STKaiti', 'Noto Serif SC', serif" },
  { id: "source-han-sans", name: "思源黑体", family: "'Source Han Sans SC', 'Noto Sans SC', sans-serif" },
  { id: "source-han-serif", name: "思源宋体", family: "'Source Han Serif SC', 'Noto Serif SC', serif" },
];
