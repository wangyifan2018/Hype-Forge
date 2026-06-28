"use client";

import { useCallback, useRef, useState } from "react";
import { ImageIcon, Star, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  validateImageFile,
} from "@/lib/forge/image";
import { readImageMeta, type ImageMeta } from "@/lib/forge/image-client";

export type ProductImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type ProductImagesUploadProps = {
  images: ProductImageDraft[];
  onChange: (images: ProductImageDraft[]) => void;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ProductImagesUpload({
  images,
  onChange,
}: ProductImagesUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        toast.error(`最多上传 ${MAX_IMAGES} 张`);
        return;
      }

      const toAdd = list.slice(0, remaining);
      const next: ProductImageDraft[] = [...images];

      for (const file of toAdd) {
        const err = validateImageFile(file);
        if (err) {
          toast.error(err);
          continue;
        }
        let meta: ImageMeta;
        try {
          meta = await readImageMeta(file);
        } catch {
          toast.error("无法读取图片尺寸");
          continue;
        }
        next.push({
          id: newId(),
          file,
          previewUrl: URL.createObjectURL(file),
          width: meta.width,
          height: meta.height,
        });
      }

      if (next.length > images.length) {
        onChange(next);
      }
      if (list.length > remaining) {
        toast.info(`已添加 ${remaining} 张，其余超出上限未添加`);
      }
    },
    [images, onChange]
  );

  const remove = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      const item = images.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      onChange(images.filter((i) => i.id !== id));
      toast.success("已删除该图片");
    },
    [images, onChange]
  );

  const clearAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      for (const img of images) {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      }
      onChange([]);
      toast.success("已清空全部图片");
    },
    [images, onChange]
  );

  const setAsCover = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const idx = images.findIndex((i) => i.id === id);
      if (idx <= 0) return;
      const next = [...images];
      const [item] = next.splice(idx, 1);
      next.unshift(item!);
      onChange(next);
      toast.success("已设为主图");
    },
    [images, onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-terminal-muted">
          已选 {images.length}/{MAX_IMAGES} 张 · 首张用于识图与豆包主参考
        </span>
        {images.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-red-400/90 hover:text-red-300"
            onClick={clearAll}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            清空全部
          </Button>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-terminal-border bg-terminal-panel/50 p-3 transition-colors",
          dragOver && "border-terminal-accent bg-terminal-accent/5",
          images.length >= MAX_IMAGES && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <ImageIcon className="mb-1 h-6 w-6 text-terminal-muted" />
        <p className="text-center text-xs text-terminal-muted">
          点击或拖拽添加商品图
        </p>
        <p className="text-[10px] text-terminal-muted/80">
          任意分辨率 · JPEG/PNG/WebP · 单张 ≤
          {MAX_IMAGE_BYTES / 1024 / 1024}MB
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded border border-terminal-border bg-terminal-panel/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={img.file.name}
                className="aspect-square w-full object-cover"
              />
              {idx === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-terminal-accent/90 px-1 text-[9px] text-terminal-bg">
                  主图
                </span>
              ) : (
                <button
                  type="button"
                  title="设为主图"
                  aria-label="设为主图"
                  onClick={(e) => setAsCover(img.id, e)}
                  className="absolute left-1 top-1 rounded bg-terminal-bg/80 p-0.5 opacity-90 hover:bg-terminal-accent/80"
                >
                  <Star className="h-3 w-3 text-terminal-muted" />
                </button>
              )}
              <span className="absolute bottom-1 left-1 rounded bg-terminal-bg/80 px-1 text-[9px] text-terminal-muted">
                {img.width}×{img.height}
              </span>
              <button
                type="button"
                title="删除此图"
                aria-label="删除此图"
                onClick={(e) => remove(img.id, e)}
                className="absolute right-1 top-1 rounded-full bg-red-950/90 p-1 text-red-200 opacity-95 hover:bg-red-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
