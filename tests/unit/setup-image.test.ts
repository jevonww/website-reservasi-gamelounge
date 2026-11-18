import { describe, expect, it } from "vitest";
import { detectSetupImageMime, SETUP_IMAGE_MAX_BYTES } from "@/src/lib/setup-image";

function bytes(...values: number[]) {
  return new Uint8Array(values);
}

function text(value: string) {
  return new TextEncoder().encode(value);
}

describe("setup image validation", () => {
  it("detects supported image signatures", () => {
    expect(detectSetupImageMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectSetupImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
    expect(detectSetupImageMime(text("GIF89a"))).toBe("image/gif");
    expect(detectSetupImageMime(text("RIFF1234WEBP"))).toBe("image/webp");
    expect(detectSetupImageMime(text("....ftypavif"))).toBe("image/avif");
  });

  it("rejects content that only pretends to be an image", () => {
    expect(detectSetupImageMime(text("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"))).toBeNull();
    expect(detectSetupImageMime(text("not an image"))).toBeNull();
    expect(detectSetupImageMime(bytes())).toBeNull();
  });

  it("caps uploads at 5 MB", () => {
    expect(SETUP_IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024);
  });
});
