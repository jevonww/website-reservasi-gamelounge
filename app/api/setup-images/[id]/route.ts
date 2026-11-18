import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serves uploaded setup media. Rows are immutable (a new upload gets a new id),
 * so the response can be cached aggressively by browsers and CDNs.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const image = await prisma.setupImage.findUnique({
    where: { id },
    select: { mimeType: true, data: true },
  });

  if (!image) {
    return new Response("Gambar tidak ditemukan.", { status: 404 });
  }

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
