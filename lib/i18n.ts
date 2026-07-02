// Lightweight UI localization. The UI language follows the browser's
// preferred languages; resume content language is tracked separately via
// the markdown frontmatter `language` field.
export type Locale = "zh" | "en";

export function detectLocale(preferredLanguages: string[]): Locale {
  const normalized = preferredLanguages.map((language) =>
    language.trim().replace(/_/g, "-").toLowerCase()
  );
  const firstKnownLanguage = normalized.find(
    (language) => language.startsWith("zh") || language.startsWith("en")
  );

  return firstKnownLanguage?.startsWith("en") ? "en" : "zh";
}

export interface UIMessages {
  photoUploadedPlaceholder: string;
  photoStorageWarning: string;
  photoUploadFailed: string;
  photoUnsupportedType: string;
  photoTooLarge: string;
  photoReadError: string;
  resumeDocTitle: string;
  previewEmptyHint: string;
  zoomOut: string;
  zoomIn: string;
  zoomLevel: string;
  editAppearance: string;
  smartOnePage: string;
  print: string;
  exportPdf: string;
  prevPage: string;
  nextPage: string;
  formatSettings: string;
  resetStyles: string;
  font: string;
  fontSize: string;
  lineHeight: string;
  pagePadding: string;
  sectionSpacing: string;
  onePageOverflowToast: string;
  changePhoto: string;
  uploadPhoto: string;
}

const UI_MESSAGES: Record<Locale, UIMessages> = {
  zh: {
    photoUploadedPlaceholder: "已上传照片",
    photoStorageWarning: "照片已用于预览，但浏览器本地空间不足，刷新后可能丢失。",
    photoUploadFailed: "照片上传失败。",
    photoUnsupportedType: "仅支持 JPG、PNG 或 WebP 图片。",
    photoTooLarge: "图片不能超过 5MB。",
    photoReadError: "无法读取图片。",
    resumeDocTitle: "简历",
    previewEmptyHint: "Markdown 解析后会在这里显示预览。",
    zoomOut: "缩小",
    zoomIn: "放大",
    zoomLevel: "缩放比例",
    editAppearance: "编辑外观",
    smartOnePage: "智能一页",
    print: "打印",
    exportPdf: "导出 PDF",
    prevPage: "上一页",
    nextPage: "下一页",
    formatSettings: "排版设置",
    resetStyles: "恢复默认样式",
    font: "字体",
    fontSize: "字号",
    lineHeight: "行距",
    pagePadding: "页边距",
    sectionSpacing: "段落间距",
    onePageOverflowToast: "已收紧到最小排版；内容仍超过一页，可继续精简内容",
    changePhoto: "更换照片",
    uploadPhoto: "上传照片",
  },
  en: {
    photoUploadedPlaceholder: "Photo uploaded",
    photoStorageWarning:
      "The photo is used in the preview, but browser storage is full, so it may be lost after a refresh.",
    photoUploadFailed: "Photo upload failed.",
    photoUnsupportedType: "Only JPG, PNG, or WebP images are supported.",
    photoTooLarge: "The image must be smaller than 5MB.",
    photoReadError: "Could not read the image.",
    resumeDocTitle: "Resume",
    previewEmptyHint: "The preview appears here once the Markdown is parsed.",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    zoomLevel: "Zoom level",
    editAppearance: "Edit appearance",
    smartOnePage: "Smart one page",
    print: "Print",
    exportPdf: "Export PDF",
    prevPage: "Previous",
    nextPage: "Next",
    formatSettings: "Format settings",
    resetStyles: "Reset to default styles",
    font: "Font",
    fontSize: "Font size",
    lineHeight: "Line height",
    pagePadding: "Page margin",
    sectionSpacing: "Section spacing",
    onePageOverflowToast:
      "Tightened to the most compact layout; the content still exceeds one page — try trimming it further.",
    changePhoto: "Change photo",
    uploadPhoto: "Upload photo",
  },
};

export function getUIMessages(locale: Locale): UIMessages {
  return UI_MESSAGES[locale];
}

// Every localized value the photo placeholder may have been saved as,
// so previously saved resumes keep working after a language switch.
export const PHOTO_UPLOADED_PLACEHOLDERS = new Set(
  Object.values(UI_MESSAGES).map((messages) => messages.photoUploadedPlaceholder)
);
