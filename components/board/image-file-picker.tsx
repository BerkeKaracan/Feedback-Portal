"use client";

import { ImagePlus, X } from "lucide-react";

import { assertImageFile } from "@/lib/attachments";
import { cn } from "@/lib/utils";

type ImageFilePickerProps = {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

export function ImageFilePicker({
  files,
  onChange,
  maxFiles,
  label = "Images",
  hint,
  disabled = false,
  className,
}: ImageFilePickerProps) {
  function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (picked.length === 0) return;

    const next = [...files];
    for (const file of picked) {
      if (next.length >= maxFiles) break;
      try {
        assertImageFile(file);
        next.push(file);
      } catch {
        // Skip invalid; parent can show a generic error if needed.
      }
    }
    onChange(next);
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-slate-500">
          {files.length}/{maxFiles}
        </span>
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}

      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => {
            const preview = URL.createObjectURL(file);
            return (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="relative size-12 overflow-hidden rounded-md border border-slate-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  className="absolute top-0.5 right-0.5 rounded-full bg-slate-900/70 p-0.5 text-white"
                  aria-label="Remove image"
                >
                  <X className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {files.length < maxFiles ? (
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 self-start rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-50",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <ImagePlus className="size-4" />
          Add image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled}
            multiple={maxFiles - files.length > 1}
            onChange={handlePick}
          />
        </label>
      ) : null}
    </div>
  );
}
