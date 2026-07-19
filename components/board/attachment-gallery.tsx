"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { PostAttachment } from "@/types/database";
import { cn } from "@/lib/utils";

type AttachmentGalleryProps = {
  attachments: PostAttachment[];
  className?: string;
  size?: "sm" | "md";
};

export function AttachmentGallery({
  attachments,
  className,
  size = "md",
}: AttachmentGalleryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const visible = attachments.filter((item) => item.url);

  if (visible.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap gap-2",
          size === "sm" ? "gap-1.5" : "gap-2",
          className
        )}
      >
        {visible.map((attachment) => (
          <button
            key={attachment.id}
            type="button"
            onClick={() => setLightboxUrl(attachment.url ?? null)}
            className={cn(
              "overflow-hidden rounded-lg border border-slate-200 bg-slate-50",
              size === "sm" ? "size-14" : "size-20"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url!}
              alt=""
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>

      {lightboxUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close image"
          >
            <X className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
