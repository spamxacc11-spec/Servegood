import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import type { FilePurpose } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Uploads images to /api/files and reports their URLs. Only URLs are kept in
 * the form; the bytes go to the storage backend, never into PostgreSQL.
 */
export function ImageUpload({
  purpose,
  value,
  onChange,
  max = 1,
  label = "Add photo",
}: {
  purpose: FilePurpose;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const room = max - value.length;
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5 MB`);
        uploaded.push((await api.upload(file, purpose)).url);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      if (uploaded.length) onChange([...value, ...uploaded]);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url + i} className="relative h-24 w-24 overflow-hidden rounded-control border border-line bg-surface">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-canvas/90 text-ink shadow-raised hover:bg-canvas"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label
            htmlFor={id}
            className={cn(
              "flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed border-control text-center text-[12.5px] font-semibold text-muted transition-colors duration-150 hover:border-brand hover:text-brand-strong",
              busy && "pointer-events-none opacity-60",
            )}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            )}
            {busy ? "Uploading" : label}
          </label>
        )}
      </div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={ACCEPT}
        multiple={max - value.length > 1}
        className="sr-only"
        onChange={(e) => void pick(e.target.files)}
      />
      <p className="mt-1.5 text-[12.5px] text-muted">JPEG, PNG or WebP, up to 5 MB{max > 1 ? `, at most ${max}` : ""}.</p>
      {error && <p role="alert" className="mt-1 text-[13px] text-alert">{error}</p>}
    </div>
  );
}
