import { describe, expect, it } from "vitest";
import type { BookingStatus } from "@/src/generated/prisma/enums";
import {
  BOOKING_TRANSITIONS,
  assertTransition,
  canTransition,
  isCancellable,
  isFinalStatus,
} from "@/src/lib/booking/status";

const ALL: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
];

describe("booking status machine", () => {
  it("allows the happy path from pending to completed", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "CHECKED_IN")).toBe(true);
    expect(canTransition("CHECKED_IN", "ACTIVE")).toBe(true);
    expect(canTransition("ACTIVE", "COMPLETED")).toBe(true);
  });

  it("rejects skipping steps", () => {
    expect(canTransition("PENDING", "CHECKED_IN")).toBe(false);
    expect(canTransition("PENDING", "ACTIVE")).toBe(false);
    expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransition("CHECKED_IN", "CONFIRMED")).toBe(false);
  });

  it("treats completed, cancelled and expired as terminal", () => {
    for (const status of ["COMPLETED", "CANCELLED", "EXPIRED"] as BookingStatus[]) {
      expect(isFinalStatus(status)).toBe(true);
      for (const target of ALL) {
        expect(canTransition(status, target)).toBe(false);
      }
    }
  });

  it("only allows cancellation from pending or confirmed", () => {
    expect(isCancellable("PENDING")).toBe(true);
    expect(isCancellable("CONFIRMED")).toBe(true);
    for (const status of ["CHECKED_IN", "ACTIVE", "COMPLETED", "CANCELLED", "EXPIRED"] as BookingStatus[]) {
      expect(isCancellable(status)).toBe(false);
    }
  });

  it("throws a descriptive error for invalid transitions", () => {
    expect(() => assertTransition("COMPLETED", "ACTIVE")).toThrow(/tidak diizinkan/);
    expect(() => assertTransition("PENDING", "CONFIRMED")).not.toThrow();
  });

  it("defines targets for every status", () => {
    for (const status of ALL) {
      expect(Array.isArray(BOOKING_TRANSITIONS[status])).toBe(true);
    }
  });
});
