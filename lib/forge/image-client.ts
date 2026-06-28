import {
  fileToDataUrl,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  MAX_VISION_EDGE,
  validateImageDataUrl,
} from "@/lib/forge/image";

export type ImageMeta = {
  width: number;
  height: number;
  size: number;
};

export async function readImageMeta(file: File): Promise<ImageMeta> {
  const url = URL.createObjectURL(file);
  try {
    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("无法读取图片尺寸"));
        img.src = url;
      }
    );
    return { ...dims, size: file.size };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareVisionDataUrl(file: File): Promise<string> {
  const meta = await readImageMeta(file);
  const longEdge = Math.max(meta.width, meta.height);
  if (longEdge <= MAX_VISION_EDGE) {
    return fileToDataUrl(file);
  }

  const url = URL.createObjectURL(file);
  try {
    const bitmap = await createImageBitmap(await fetch(url).then((r) => r.blob()));
    const scale = MAX_VISION_EDGE / longEdge;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fileToDataUrl(file);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type || "image/jpeg", 0.88)
    );
    if (!blob) return fileToDataUrl(file);
    if (blob.size > MAX_IMAGE_BYTES) return fileToDataUrl(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("压缩图片失败"));
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function filesToProductImages(
  files: File[]
): Promise<
  { dataUrl: string; width: number; height: number; role: "cover" | "detail" }[]
> {
  const slice = files.slice(0, MAX_IMAGES);
  const out: {
    dataUrl: string;
    width: number;
    height: number;
    role: "cover" | "detail";
  }[] = [];

  for (let i = 0; i < slice.length; i++) {
    const file = slice[i]!;
    const meta = await readImageMeta(file);
    const dataUrl = await prepareVisionDataUrl(file);
    const err = validateImageDataUrl(dataUrl);
    if (err) throw new Error(err);
    out.push({
      dataUrl,
      width: meta.width,
      height: meta.height,
      role: i === 0 ? "cover" : "detail",
    });
  }
  return out;
}
