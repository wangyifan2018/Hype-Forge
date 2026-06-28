"use client";

import { useCallback, useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

type ImageUploadProps = {
  file: File | null;
  preview: string | null;
  onChange: (file: File | null, preview: string | null) => void;
};

export function ImageUpload({ file, preview, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (f: File) => {
      if (!ALLOWED.includes(f.type)) {
        toast.error("仅支持 JPEG / PNG / WebP");
        return;
      }
      if (f.size > MAX_BYTES) {
        toast.error("图片不能超过 5MB");
        return;
      }
      const url = URL.createObjectURL(f);
      onChange(f, url);
    },
    [onChange]
  );

  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
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
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-terminal-border bg-terminal-panel/50 p-4 transition-colors",
          dragOver && "border-terminal-accent bg-terminal-accent/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {preview ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={file?.name ?? "商品预览"}
              className="mx-auto max-h-28 rounded object-contain"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="absolute right-0 top-0 rounded-full bg-terminal-bg/80 p-1 hover:bg-terminal-border"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <ImageIcon className="mb-2 h-8 w-8 text-terminal-muted" />
            <p className="text-center text-xs text-terminal-muted">
              拖拽或点击上传商品白底图
            </p>
            <p className="text-[10px] text-terminal-muted/80">
              JPEG / PNG / WebP · ≤5MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
