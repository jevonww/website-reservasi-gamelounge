/** Setup media limits shared by the admin uploader and the server action. */
export const SETUP_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const SETUP_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

export type SetupImageMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/avif"
  | "image/gif";

function ascii(bytes: Uint8Array, start: number, length: number) {
  if (bytes.length < start + length) return "";
  let text = "";
  for (let index = start; index < start + length; index += 1) {
    text += String.fromCharCode(bytes[index]);
  }
  return text;
}

/**
 * Detect the real image type from its magic bytes. Never trust the MIME type
 * supplied by the browser: anyone can rename an arbitrary file to `.png`.
 */
export function detectSetupImageMime(bytes: Uint8Array): SetupImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) {
    return "image/gif";
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp";
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }

  return null;
}
