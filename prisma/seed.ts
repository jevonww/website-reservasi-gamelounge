import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const hashPassword = (plain: string) => bcrypt.hash(plain, 12);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur. Salin .env.example menjadi .env.");
}

const prisma = new PrismaClient({
  // Keep timestamptz reads/writes exact regardless of the server timezone.
  adapter: new PrismaPg({ connectionString, options: "-c timezone=UTC" }),
});

const SETUPS = [
  {
    name: "LEVELUP PC Alpha",
    slug: "levelup-pc-alpha",
    category: "PC Gaming",
    description:
      "Stasiun PC entry-level yang tetap cepat dan nyaman untuk ranked harian. Cocok untuk Valorant, CS2, Dota 2, dan game esports favoritmu dengan monitor 180Hz dan kursi ergonomis.",
    specs: {
      processor: "Intel Core i5-13400F",
      graphics: "NVIDIA RTX 4060 8GB",
      memory: "16GB DDR5 5600MHz",
      storage: "1TB NVMe SSD",
      display: '24" Full HD 180Hz',
      accessories: "Headset HyperX + keyboard mekanikal",
    },
    facilities: ["Kursi gaming ergonomis", "Headset studio", "AC ruangan", "WiFi 1Gbps", "Minuman gratis"],
    imageUrl: "/images/setups/pc-alpha.svg",
    gallery: ["/images/setups/pc-alpha.svg", "/images/setups/room-main.svg"],
    hourlyRate: 15000,
    featured: false,
    sortOrder: 1,
    status: "AVAILABLE" as const,
  },
  {
    name: "LEVELUP PC Pro",
    slug: "levelup-pc-pro",
    category: "PC Gaming",
    description:
      "PC performa tinggi untuk competitive gaming dan streaming. RTX 4070 Super dengan monitor 240Hz memberi frame rate stabil di setting kompetitif maupun sinematik.",
    specs: {
      processor: "Intel Core i7-14700KF",
      graphics: "NVIDIA RTX 4070 Super 12GB",
      memory: "32GB DDR5 6000MHz",
      storage: "2TB NVMe Gen4 SSD",
      display: '27" QHD 240Hz IPS',
      accessories: "Headset wireless + mouse 8K polling",
    },
    facilities: [
      "Kursi gaming premium",
      "Headset wireless",
      "Streaming-ready webcam",
      "AC ruangan",
      "WiFi 1Gbps",
      "Minuman gratis",
    ],
    imageUrl: "/images/setups/pc-pro.svg",
    gallery: ["/images/setups/pc-pro.svg", "/images/setups/room-main.svg"],
    hourlyRate: 25000,
    featured: true,
    sortOrder: 2,
    status: "AVAILABLE" as const,
  },
  {
    name: "LEVELUP PS5 Station",
    slug: "levelup-ps5-station",
    category: "Console",
    description:
      "Nikmati game konsol terbaru di layar 4K dengan dua DualSense. Sempurna untuk EA FC, Tekken 8, Spider-Man 2, atau sesi co-op bersama teman.",
    specs: {
      console: "PlayStation 5 Slim",
      display: '55" 4K HDR TV',
      accessories: "2x DualSense Wireless Controller",
      audio: "Soundbar Dolby Atmos",
      seating: "Sofa 3 seater",
    },
    facilities: ["Sofa nyaman", "2 controller", "Soundbar", "AC ruangan", "WiFi 1Gbps", "Minuman gratis"],
    imageUrl: "/images/setups/ps5.svg",
    gallery: ["/images/setups/ps5.svg", "/images/setups/room-main.svg"],
    hourlyRate: 30000,
    featured: true,
    sortOrder: 3,
    status: "AVAILABLE" as const,
  },
  {
    name: "LEVELUP Private Room",
    slug: "levelup-private-room",
    category: "Private Room",
    description:
      "Ruang privat ber-AC untuk squad, mini tournament, atau sesi panjang. Empat PC Pro, layar besar untuk spectate, sofa, dan snack bar dalam satu ruangan.",
    specs: {
      stations: "4x LEVELUP PC Pro",
      display: '85" 4K Presentation Screen',
      room: "Private room 24m² dengan AC",
      accessories: "Sofa, snack bar, mini fridge",
      audio: "Speaker surround + 4 headset",
    },
    facilities: [
      "Ruang privat",
      "4 PC Pro",
      "Sofa & snack bar",
      "AC ruangan",
      "WiFi 1Gbps",
      "Minuman & snack",
    ],
    imageUrl: "/images/setups/private-room.svg",
    gallery: ["/images/setups/private-room.svg", "/images/setups/room-main.svg"],
    hourlyRate: 60000,
    featured: true,
    sortOrder: 4,
    status: "AVAILABLE" as const,
  },
];

async function main() {
  console.log("Seeding LEVELUP…");

  await prisma.loungeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@levelup.id").toLowerCase();
  const adminUsername = (process.env.SEED_ADMIN_USERNAME ?? "adminlevelup").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "200209";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, username: true },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "LEVELUP Admin",
        email: adminEmail,
        username: adminUsername,
        passwordHash: await hashPassword(adminPassword),
        role: "ADMIN",
      },
    });
    console.log(`Admin dibuat: ${adminEmail} (username: ${adminUsername})`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.warn(
        "PERINGATAN: password admin default dipakai. Segera ubah setelah login pertama.",
      );
    }
  } else if (!existingAdmin.username) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { username: adminUsername },
    });
    console.log(`Username admin diset: ${adminUsername}`);
  } else {
    console.log(`Admin sudah ada: ${adminEmail} (username: ${existingAdmin.username})`);
  }

  const seedDemoData =
    process.env.SEED_DEMO_DATA === "true" ||
    (process.env.SEED_DEMO_DATA !== "false" && process.env.NODE_ENV !== "production");

  const customerEmail = "player@levelup.id";
  if (seedDemoData) {
    const existingCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
    if (!existingCustomer) {
      await prisma.user.create({
        data: {
          name: "Demo Player",
          email: customerEmail,
          passwordHash: await hashPassword("Player#Levelup2026"),
          role: "CUSTOMER",
          phone: "+62 812 3456 7890",
        },
      });
      console.log(`Customer demo dibuat: ${customerEmail}`);
    }

    for (const setup of SETUPS) {
      await prisma.setup.upsert({
        where: { slug: setup.slug },
        update: {
          name: setup.name,
          category: setup.category,
          description: setup.description,
          specs: setup.specs,
          facilities: setup.facilities,
          imageUrl: setup.imageUrl,
          gallery: setup.gallery,
          hourlyRate: setup.hourlyRate,
          featured: setup.featured,
          sortOrder: setup.sortOrder,
        },
        create: setup,
      });
    }
    console.log(`${SETUPS.length} setup demo siap.`);
  } else {
    console.log("SEED_DEMO_DATA dimatikan / NODE_ENV=production: data demo dilewati.");
  }

  console.log("Seed selesai. Password demo hanya untuk pengembangan lokal.");
  console.log(`Admin: ${adminEmail}`);
  if (seedDemoData) {
    console.log(`Customer demo: ${customerEmail} / Player#Levelup2026`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
