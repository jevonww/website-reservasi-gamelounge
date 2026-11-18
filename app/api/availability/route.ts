import { NextResponse } from "next/server";
import { getSetupAvailability, BookingError } from "@/src/lib/booking/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setupId = searchParams.get("setupId") ?? "";
  const date = searchParams.get("date") ?? "";
  const duration = Number(searchParams.get("duration") ?? "0");

  if (!setupId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(duration) || duration <= 0) {
    return NextResponse.json(
      { error: "Parameter availability tidak valid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await getSetupAvailability({
      setupId,
      date,
      durationMinutes: duration,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    if (error instanceof BookingError) {
      const status = error.code === "SETUP_NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { error: error.message },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("availability route failed", error);
    return NextResponse.json(
      { error: "Gagal memuat ketersediaan." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
