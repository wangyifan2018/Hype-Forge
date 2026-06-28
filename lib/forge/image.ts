export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 6;
export const MAX_VISION_EDGE = 1280;
export const MAX_VISION_TOTAL_BYTES = 12 * 1024 * 1024;

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) {
    return "仅支持 JPEG / PNG / WebP";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "单张图片不能超过 5MB";
  }
  return null;
}

export function validateImageDataUrl(dataUrl: string): string | null {
  if (!dataUrl.startsWith("data:image/")) {
    return "无效的图片格式";
  }
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,/);
  if (!match || !ALLOWED.includes(match[1])) {
    return "仅支持 JPEG / PNG / WebP";
  }
  const base64 = dataUrl.split(",")[1] ?? "";
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) return "单张识图图不能超过 5MB";
  return null;
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const err = validateImageFile(file);
    if (err) {
      reject(new Error(err));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}
