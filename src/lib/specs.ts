import { asRecord } from "@/src/lib/utils";

export const SPEC_LABELS: Record<string, string> = {
  processor: "CPU",
  graphics: "GPU",
  memory: "RAM",
  storage: "Storage",
  display: "Display",
  accessories: "Aksesori",
  console: "Console",
  audio: "Audio",
  seating: "Seating",
  stations: "Stations",
  room: "Ruang",
};

export function specEntries(specs: unknown, limit?: number) {
  const record = asRecord(specs);
  const entries = Object.entries(record)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => ({
      key,
      label: SPEC_LABELS[key] ?? key,
      value: String(value),
    }));
  return typeof limit === "number" ? entries.slice(0, limit) : entries;
}
