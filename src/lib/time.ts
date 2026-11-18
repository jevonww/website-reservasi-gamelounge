import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { addMinutes } from "date-fns";

export function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 24 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Jam tidak valid: ${value}`);
  }
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Convert a lounge-local date ("yyyy-MM-dd") + time ("HH:mm") into a UTC instant. */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string) {
  return fromZonedTime(`${date}T${time}:00`, timeZone);
}

/** Current date string in the lounge timezone. */
export function todayInZone(timeZone: string, now: Date = new Date()) {
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd");
}

export function formatInLounge(
  date: Date | string,
  timeZone: string,
  pattern = "dd MMM yyyy, HH:mm",
) {
  const value = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(value, timeZone, pattern, { locale: undefined });
}

export function formatDateLong(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export function formatTime(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours} jam ${rest} menit`;
  if (hours) return `${hours} jam`;
  return `${rest} menit`;
}

export function startOfLoungeDayUtc(date: string, timeZone: string) {
  return fromZonedTime(`${date}T00:00:00`, timeZone);
}

/** Server-side guard: whether an instant has already passed. */
export function isInPast(date: Date) {
  return date.getTime() <= Date.now();
}

export function zonedNow(timeZone: string) {
  return toZonedTime(new Date(), timeZone);
}

/**
 * Build candidate start times for one lounge-local day.
 * Returns UTC instants at `slotIntervalMinutes` cadence between open and close.
 */
export function buildDailySlots(input: {
  date: string;
  timeZone: string;
  openTime: string;
  closeTime: string;
  slotIntervalMinutes: number;
  durationMinutes: number;
}) {
  const open = parseTimeToMinutes(input.openTime);
  const close = parseTimeToMinutes(input.closeTime);
  const latestStart = close - input.durationMinutes;

  const slots: { start: Date; end: Date; label: string }[] = [];
  for (let minute = open; minute <= latestStart; minute += input.slotIntervalMinutes) {
    const time = minutesToTime(minute);
    const start = zonedDateTimeToUtc(input.date, time, input.timeZone);
    const end = addMinutes(start, input.durationMinutes);
    slots.push({ start, end, label: time });
  }
  return slots;
}

export function isWithinOperatingHours(input: {
  start: Date;
  end: Date;
  timeZone: string;
  openTime: string;
  closeTime: string;
}) {
  const startLocal = formatInTimeZone(input.start, input.timeZone, "HH:mm");
  const endLocal = formatInTimeZone(input.end, input.timeZone, "HH:mm");
  const startDate = formatInTimeZone(input.start, input.timeZone, "yyyy-MM-dd");
  const endDate = formatInTimeZone(input.end, input.timeZone, "yyyy-MM-dd");

  if (startDate !== endDate) return false;

  const start = parseTimeToMinutes(startLocal);
  const end = parseTimeToMinutes(endLocal);
  return start >= parseTimeToMinutes(input.openTime) && end <= parseTimeToMinutes(input.closeTime);
}
