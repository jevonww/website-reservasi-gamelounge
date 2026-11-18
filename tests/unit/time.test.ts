import { describe, expect, it } from "vitest";
import {
  buildDailySlots,
  durationLabel,
  isWithinOperatingHours,
  minutesToTime,
  parseTimeToMinutes,
  startOfLoungeDayUtc,
  todayInZone,
  zonedDateTimeToUtc,
} from "@/src/lib/time";

const TZ = "Asia/Jakarta";

describe("timezone conversion", () => {
  it("converts lounge-local time to UTC (WIB = UTC+7)", () => {
    const instant = zonedDateTimeToUtc("2026-11-05", "10:00", TZ);
    expect(instant.toISOString()).toBe("2026-11-05T03:00:00.000Z");
  });

  it("finds the UTC start of a lounge day", () => {
    const instant = startOfLoungeDayUtc("2026-11-05", TZ);
    expect(instant.toISOString()).toBe("2026-11-04T17:00:00.000Z");
  });

  it("formats today in the lounge timezone, not the server timezone", () => {
    const now = new Date("2026-11-05T20:00:00.000Z"); // 03:00 next day in Jakarta
    expect(todayInZone(TZ, now)).toBe("2026-11-06");
  });
});

describe("time parsing", () => {
  it("parses and formats times", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("10:30")).toBe(630);
    expect(parseTimeToMinutes("22:00")).toBe(1320);
    expect(minutesToTime(630)).toBe("10:30");
    expect(minutesToTime(1320)).toBe("22:00");
  });

  it("rejects malformed times", () => {
    expect(() => parseTimeToMinutes("10:75")).toThrow();
    expect(() => parseTimeToMinutes("abc")).toThrow();
    expect(() => parseTimeToMinutes("25:00")).toThrow();
  });
});

describe("buildDailySlots", () => {
  it("only emits starts that leave room for the full duration", () => {
    const slots = buildDailySlots({
      date: "2026-11-05",
      timeZone: TZ,
      openTime: "10:00",
      closeTime: "12:00",
      slotIntervalMinutes: 60,
      durationMinutes: 60,
    });
    expect(slots.map((slot) => slot.label)).toEqual(["10:00", "11:00"]);
    expect(slots[0].start.toISOString()).toBe("2026-11-05T03:00:00.000Z");
    expect(slots[0].end.toISOString()).toBe("2026-11-05T04:00:00.000Z");
  });

  it("respects a 30-minute interval", () => {
    const slots = buildDailySlots({
      date: "2026-11-05",
      timeZone: TZ,
      openTime: "10:00",
      closeTime: "12:00",
      slotIntervalMinutes: 30,
      durationMinutes: 60,
    });
    expect(slots.map((slot) => slot.label)).toEqual(["10:00", "10:30", "11:00"]);
  });

  it("returns no slots when the duration exceeds the opening window", () => {
    const slots = buildDailySlots({
      date: "2026-11-05",
      timeZone: TZ,
      openTime: "10:00",
      closeTime: "11:00",
      slotIntervalMinutes: 60,
      durationMinutes: 120,
    });
    expect(slots).toEqual([]);
  });
});

describe("isWithinOperatingHours", () => {
  const at = (time: string) => zonedDateTimeToUtc("2026-11-05", time, TZ);

  it("accepts sessions fully inside opening hours, including the closing edge", () => {
    expect(
      isWithinOperatingHours({
        start: at("10:00"),
        end: at("12:00"),
        timeZone: TZ,
        openTime: "10:00",
        closeTime: "12:00",
      }),
    ).toBe(true);
  });

  it("rejects sessions starting before opening", () => {
    expect(
      isWithinOperatingHours({
        start: at("09:00"),
        end: at("10:00"),
        timeZone: TZ,
        openTime: "10:00",
        closeTime: "12:00",
      }),
    ).toBe(false);
  });

  it("rejects sessions ending after closing", () => {
    expect(
      isWithinOperatingHours({
        start: at("11:30"),
        end: at("12:30"),
        timeZone: TZ,
        openTime: "10:00",
        closeTime: "12:00",
      }),
    ).toBe(false);
  });

  it("rejects sessions that cross midnight", () => {
    const start = zonedDateTimeToUtc("2026-11-05", "23:00", TZ);
    const end = zonedDateTimeToUtc("2026-11-06", "01:00", TZ);
    expect(
      isWithinOperatingHours({
        start,
        end,
        timeZone: TZ,
        openTime: "10:00",
        closeTime: "23:59",
      }),
    ).toBe(false);
  });
});

describe("durationLabel", () => {
  it("renders hours and minutes in Indonesian", () => {
    expect(durationLabel(60)).toBe("1 jam");
    expect(durationLabel(90)).toBe("1 jam 30 menit");
    expect(durationLabel(45)).toBe("45 menit");
    expect(durationLabel(0)).toBe("0 menit");
  });
});
