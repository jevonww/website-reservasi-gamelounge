import { describe, expect, it } from "vitest";
import {
  calculateBookingPrice,
  durationOptions,
  validateDuration,
} from "@/src/lib/pricing";

const LIMITS = {
  minDurationMinutes: 60,
  maxDurationMinutes: 240,
  slotIntervalMinutes: 60,
};

describe("calculateBookingPrice", () => {
  it("charges the hourly rate for exactly one hour", () => {
    expect(calculateBookingPrice(25_000, 60)).toBe(25_000);
  });

  it("prorates by the minute and rounds to whole rupiah", () => {
    expect(calculateBookingPrice(25_000, 90)).toBe(37_500);
    expect(calculateBookingPrice(15_000, 45)).toBe(11_250);
    expect(calculateBookingPrice(20_000, 50)).toBe(16_667);
  });

  it("never trusts a client-supplied price and rejects invalid rates", () => {
    expect(() => calculateBookingPrice(Number.NaN, 60)).toThrow();
    expect(() => calculateBookingPrice(-1, 60)).toThrow();
    expect(() => calculateBookingPrice(10_000, 0)).toThrow();
    expect(() => calculateBookingPrice(10_000, 0.5)).toThrow();
  });
});

describe("validateDuration", () => {
  it("accepts durations inside the limits and on the slot interval", () => {
    expect(validateDuration(60, LIMITS)).toBeNull();
    expect(validateDuration(120, LIMITS)).toBeNull();
    expect(validateDuration(240, LIMITS)).toBeNull();
  });

  it("rejects durations below the minimum", () => {
    expect(validateDuration(30, LIMITS)).toMatch(/minimal 60/);
  });

  it("rejects durations above the maximum", () => {
    expect(validateDuration(300, LIMITS)).toMatch(/maksimal 240/);
  });

  it("rejects durations that are not a slot multiple", () => {
    expect(validateDuration(90, LIMITS)).toMatch(/kelipatan 60/);
  });

  it("rejects non-integer durations", () => {
    expect(validateDuration(60.5, LIMITS)).toMatch(/angka bulat/);
  });
});

describe("durationOptions", () => {
  it("builds inclusive options at the slot cadence", () => {
    expect(durationOptions(LIMITS)).toEqual([60, 120, 180, 240]);
  });
});
