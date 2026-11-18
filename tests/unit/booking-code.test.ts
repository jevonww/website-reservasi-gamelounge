import { describe, expect, it } from "vitest";
import { generateBookingCode } from "@/src/lib/booking/service";

const CODE_PATTERN = /^LVL-(\d{6})-([A-Z2-9]{8})$/;

describe("booking reference generator", () => {
  it("uses the lounge date prefix and a cryptographically random suffix", () => {
    // 28 Oct 2026 18:00 UTC = 29 Oct 2026 01:00 di Asia/Jakarta.
    const code = generateBookingCode(new Date("2026-10-28T18:00:00.000Z"), "Asia/Jakarta");
    expect(code).toMatch(CODE_PATTERN);
    expect(code.startsWith("LVL-261029-")).toBe(true);
  });

  it("never uses ambiguous characters (I, O, 0, 1)", () => {
    for (let index = 0; index < 200; index += 1) {
      const suffix = generateBookingCode().split("-")[2];
      expect(suffix).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it("produces unique values across many generations", () => {
    const codes = new Set(Array.from({ length: 3_000 }, () => generateBookingCode()));
    expect(codes.size).toBe(3_000);
  });

  it("keeps the date prefix stable while the suffix stays random", () => {
    const startAt = new Date("2026-11-05T03:00:00.000Z");
    const first = generateBookingCode(startAt, "Asia/Jakarta");
    const second = generateBookingCode(startAt, "Asia/Jakarta");
    expect(first.startsWith("LVL-261105-")).toBe(true);
    expect(second.startsWith("LVL-261105-")).toBe(true);
    expect(first).not.toBe(second);
  });
});
