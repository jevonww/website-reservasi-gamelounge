/**
 * Booking price is always computed on the server in Indonesian Rupiah (integer).
 * We use a per-minute rate to avoid floating point drift and round to the nearest
 * whole rupiah at the end.
 */
export function calculateBookingPrice(hourlyRate: number, durationMinutes: number) {
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new Error("Harga per jam tidak valid");
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Durasi tidak valid");
  }
  return Math.round((hourlyRate * durationMinutes) / 60);
}

export interface DurationLimits {
  minDurationMinutes: number;
  maxDurationMinutes: number;
  slotIntervalMinutes: number;
}

export function validateDuration(durationMinutes: number, limits: DurationLimits) {
  if (!Number.isInteger(durationMinutes)) return "Durasi harus berupa angka bulat.";
  if (durationMinutes < limits.minDurationMinutes) {
    return `Durasi minimal ${limits.minDurationMinutes} menit.`;
  }
  if (durationMinutes > limits.maxDurationMinutes) {
    return `Durasi maksimal ${limits.maxDurationMinutes} menit.`;
  }
  if (durationMinutes % limits.slotIntervalMinutes !== 0) {
    return `Durasi harus kelipatan ${limits.slotIntervalMinutes} menit.`;
  }
  return null;
}

export function durationOptions(limits: DurationLimits) {
  const options: number[] = [];
  for (
    let duration = limits.minDurationMinutes;
    duration <= limits.maxDurationMinutes;
    duration += limits.slotIntervalMinutes
  ) {
    options.push(duration);
  }
  return options;
}
