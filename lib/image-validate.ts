import { Buffer } from "node:buffer";

export type AllowedImageType = "image/jpeg" | "image/png" | "image/webp";

export function isAllowedImageType(t: string): t is AllowedImageType {
  return t === "image/jpeg" || t === "image/png" || t === "image/webp";
}

// Magic-Byte-Signaturen je Typ. Geprüft werden die TATSÄCHLICHEN Bytes — nicht
// der (fälschbare) vom Client behauptete MIME-Typ und nicht nur der base64-Prefix.
const MAGIC: Record<AllowedImageType, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  "image/webp": (b) =>
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP",
};

export type ImageValidation =
  | { ok: true; mediaType: AllowedImageType; byteLength: number }
  | { ok: false; error: string };

/**
 * Validate already-decoded image bytes: size cap + magic-byte match against the
 * claimed media type. Shared by the chat image path and the photo-analysis
 * upload so both enforce the same rules.
 */
export function validateImageBytes(
  buffer: Buffer,
  mediaType: string,
  opts: { maxBytes: number }
): ImageValidation {
  if (!isAllowedImageType(mediaType)) {
    return { ok: false, error: "Nicht unterstützter Bildtyp." };
  }
  if (buffer.length === 0) {
    return { ok: false, error: "Leeres Bild." };
  }
  if (buffer.length > opts.maxBytes) {
    return { ok: false, error: "Bild zu groß." };
  }
  if (!MAGIC[mediaType](buffer)) {
    return { ok: false, error: "Bilddaten passen nicht zum angegebenen Format." };
  }
  return { ok: true, mediaType, byteLength: buffer.length };
}

/**
 * Decode a base64 image (optionally a data-URL) and validate it. The size cap
 * is enforced AFTER decoding, so an oversized payload can't slip through as a
 * long base64 string.
 */
export function validateBase64Image(
  base64: string,
  mediaType: string,
  opts: { maxBytes: number }
): ImageValidation {
  const cleaned = base64.replace(/^data:[^,]+,/, "");
  const buffer = Buffer.from(cleaned, "base64");
  return validateImageBytes(buffer, mediaType, opts);
}
