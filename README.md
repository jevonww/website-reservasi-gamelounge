# LEVELUP — Premium Gaming Lounge

Platform reservasi lengkap untuk gaming lounge premium: katalog setup, mesin booking dengan proteksi bentrok jadwal, verifikasi pembayaran manual, dashboard pelanggan, dan admin console. Tampilan memakai bahasa desain **Liquid Glass** — panel kaca, gradien sinematik, aksen violet `#9B7BFF` dan cyan `#5EE7FF` di atas latar `#080810`.

> Semua angka operasional di dashboard admin dibaca langsung dari database. Tidak ada statistik palsu atau tombol placeholder.

## Daftar isi

- [Fitur](#fitur)
- [Tech stack](#tech-stack)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Variabel environment](#variabel-environment)
- [Script npm](#script-npm)
- [Aturan booking](#aturan-booking)
- [Keamanan](#keamanan)
- [Pengujian](#pengujian)
- [Struktur proyek](#struktur-proyek)
- [Dokumentasi lanjutan](#dokumentasi-lanjutan)
- [Troubleshooting](#troubleshooting)

## Fitur

**Publik**

- Landing page sinematik dengan hero, showcase setup unggulan, alur booking, fasilitas, testimoni, dan FAQ.
- Katalog `/setups` dengan pencarian, filter kategori/harga, sorting, dan pagination.
- Detail setup `/setups/[slug]` dengan galeri, spesifikasi, fasilitas, dan widget ketersediaan real-time.
- Booking checkout `/booking/checkout` dengan pemilihan tanggal, slot, durasi, nomor WhatsApp untuk konfirmasi, dan metode pembayaran (Transfer Bank, QRIS, atau Bayar di Tempat).
- Halaman booking `/booking/[code]` untuk melihat nomor referensi, status, total, dan instruksi pembayaran sesuai metode yang dipilih.

**Pelanggan**

- Registrasi dan login dengan cookie sesi HttpOnly bertanda tangan.
- Dashboard `/dashboard` berisi ringkasan booking dan riwayat.
- Profil `/dashboard/profile` untuk memperbarui nama dan nomor telepon.

**Staff / Admin**

- Overview `/admin` dengan metrik nyata: booking hari ini, pembayaran menunggu, sesi aktif, pendapatan terverifikasi, utilisasi setup, grafik 7 hari, dan audit log.
- Kelola booking `/admin/bookings`: pencarian nomor referensi/ref. pembayaran, filter status booking, status pembayaran, metode pembayaran, tanggal, pagination, dan rilis booking kedaluwarsa.
- Detail booking `/admin/bookings/[id]`: verifikasi transfer/QRIS, konfirmasi pembayaran Bayar di Tempat setelah uang diterima, konfirmasi via WhatsApp ke nomor pelanggan, check-in, mulai/selesaikan sesi, pembatalan, linimasa, dan audit log.
- CRUD setup `/admin/setups` beserta perubahan status cepat (tersedia, maintenance, nonaktif).
- Manajemen pengguna `/admin/users` (khusus admin) dengan pagination dan perubahan role.
- Pengaturan lounge `/admin/settings` (khusus admin): identitas, jam operasional, aturan durasi, batas pembayaran, kontak, rekening, dan kebijakan pembatalan.

**Kualitas**

- Validasi Zod di klien dan server, harga selalu dihitung ulang di server.
- Pencegahan double-booking berlapis: transaksi + advisory lock + exclusion constraint PostgreSQL.
- Unit test dan integration test terhadap database nyata (Vitest).
- Dukungan `prefers-reduced-motion`, navigasi keyboard, label ARIA, dan layout responsif.

## Tech stack

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Bahasa | TypeScript strict |
| Styling | Tailwind CSS v4 + utility kaca kustom di `app/globals.css` |
| Animasi | Motion for React (`motion/react`) |
| Form & validasi | React Hook Form + Zod |
| Database | PostgreSQL + Prisma ORM 7 (`prisma-client`, `@prisma/adapter-pg`) |
| Migrasi | Prisma Migrate |
| Auth | bcryptjs + JWT HttpOnly bertanda tangan (`jose`) |
| Ikon | Lucide |
| Test | Vitest |
| Deploy | Vercel + Prisma Postgres (target produksi belum dikonfigurasi) |

## Status environment

- **Development/pengujian:** PostgreSQL lokal pada cluster `.pgdata` port `55432` (schema sudah sesuai 4 migrasi yang ada). Tidak ada reset database. Gunakan `npm run db:start` / `db:stop` / `db:status` untuk mengelolanya.
- **Produksi (Prisma Postgres):** belum dikonfigurasi karena kredensial belum tersedia. Jangan mengarang connection string.
- **Deployment Vercel:** **belum dilakukan**. Deployment menunggu persetujuan eksplisit pemilik project setelah dinyatakan final.
- **Payment gateway QRIS dinamis:** belum terintegrasi; alur QRIS saat ini memakai verifikasi manual staff (lihat bagian [Nomor referensi & pembayaran](#nomor-referensi--pembayaran)).
- **Konfirmasi WhatsApp:** manual lewat tautan klik-untuk-chat (`wa.me`) dari detail booking admin. Belum memakai WhatsApp Business API, jadi tidak ada pesan otomatis.

## Menjalankan secara lokal

### 1. Prasyarat

- Node.js 20+ (disarankan 22)
- PostgreSQL 15+ yang bisa diakses lokal, **atau** database Prisma Postgres
- npm

### 2. Instal dependensi

```bash
npm install
```

### 3. Siapkan database

**Opsi A — PostgreSQL lokal**

```bash
createdb levelup
# atau lewat psql:
# psql -U postgres -c "CREATE DATABASE levelup;"
```

`DATABASE_URL` contoh:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/levelup"
```

**Opsi B — Postgres lokal dengan cluster khusus proyek**

Jika tidak ingin memakai service PostgreSQL sistem, buat cluster di `.pgdata` (sudah di-gitignore):

```bash
initdb -D .pgdata --auth=trust
npm run db:start          # sama dengan: pg_ctl -D .pgdata -o "-p 55432" -l .pgdata/server.log start
createdb -p 55432 levelup
```

```dotenv
DATABASE_URL="postgresql://postgres@localhost:55432/levelup"
```

Hentikan cluster dengan:

```bash
npm run db:stop
```

Cek statusnya dengan `npm run db:status`.

**Opsi C — Prisma Postgres (disarankan untuk produksi)**

Buat project di [Prisma Console](https://console.prisma.io), lalu salin connection string dari menu database. Panduan lengkap ada di [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### 4. Buat file environment

```bash
cp .env.example .env
```

Isi minimal `DATABASE_URL` dan `AUTH_SECRET`. Untuk membuat secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 5. Jalankan migrasi dan seed

```bash
npm run db:deploy   # menerapkan semua migrasi yang ada
npm run db:seed     # pengaturan awal, admin, dan data demo
```

Seed membuat:

| Peran | Email | Password |
| --- | --- | --- |
| Admin | `admin@levelup.id` (atau `SEED_ADMIN_EMAIL`) | `Admin#Levelup2026` (atau `SEED_ADMIN_PASSWORD`) |
| Customer demo | `player@levelup.id` | `Player#Levelup2026` |

> Kredensial di atas **hanya untuk pengembangan lokal**. Ganti password admin setelah login pertama. Di production, seed otomatis melewati customer dan setup demo; set `SEED_DEMO_DATA="false"` untuk memastikan.

### 6. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Variabel environment

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | Ya | Connection string PostgreSQL/Prisma Postgres. Gunakan `?sslmode=require` untuk database terkelola. |
| `AUTH_SECRET` | Ya (production) | Secret penandatangan sesi, minimal 32 karakter. Di development ada fallback, tetapi jangan pernah mengandalkannya di production. |
| `NEXT_PUBLIC_APP_URL` | Ya | Base URL aplikasi, mis. `https://levelup.id`. Juga dipakai untuk tautan detail booking di pesan WhatsApp; URL `localhost` otomatis dilewati. |
| `SEED_ADMIN_EMAIL` | Tidak | Email admin yang dibuat seed. Default `admin@levelup.id`. |
| `SEED_ADMIN_PASSWORD` | Tidak | Password admin awal. Default `Admin#Levelup2026`. |
| `SEED_DEMO_DATA` | Tidak | `"true"`/`"false"` untuk customer dan setup demo. Default aktif di luar production. |
| `NEXT_PUBLIC_QRIS_IMAGE_URL` | Tidak | URL gambar QRIS statis **resmi** milik merchant. Kosongkan jika belum tersedia; aplikasi tidak pernah membuat QR sendiri. |

Jangan pernah commit `.env` atau kredensial asli. `.env.example` hanya berisi placeholder.

## Script npm

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Development server (Turbopack). |
| `npm run build` | `prisma generate` lalu build produksi Next.js. |
| `npm run start` | Menjalankan hasil build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript tanpa emit. |
| `npm test` | Unit + integration test (Vitest). |
| `npm run db:generate` | Generate Prisma Client. |
| `npm run db:migrate` | Buat/aplikasikan migrasi baru (development). |
| `npm run db:deploy` | Aplikasikan migrasi yang sudah ada (production/CI). |
| `npm run db:seed` | Jalankan seed. |
| `npm run db:start` | Nyalakan cluster PostgreSQL lokal di `.pgdata` (port dari `DATABASE_URL`). |
| `npm run db:stop` | Hentikan cluster PostgreSQL lokal dengan rapi. |
| `npm run db:status` | Cek apakah cluster lokal berjalan dan tampilkan target koneksi. |
| `npm run db:studio` | Prisma Studio. |
| `npm run db:reset` | Reset database development dan jalankan ulang migrasi + seed. **Menghapus data.** |

## Aturan booking

- Slot hanya tersedia di dalam jam operasional lounge dan tidak lintas tengah malam.
- Durasi harus kelipatan interval slot, di antara durasi minimum dan maksimum pada pengaturan.
- Setup berstatus `MAINTENANCE` atau `INACTIVE` tidak bisa dipesan.
- Harga **selalu** dihitung di server dari `hourlyRate` setup; input harga dari klien diabaikan.
- Nomor WhatsApp wajib diisi saat checkout; nomor disimpan ke profil pelanggan agar staff dapat mengirim konfirmasi.
- Booking baru berstatus `PENDING` dan memiliki batas pembayaran. Setelah lewat, booking menjadi `EXPIRED` dan slot dilepas.
- Booking pelanggan lain tidak dapat dilihat atau dibatalkan (kecuali staff/admin).
- Pembatalan oleh pelanggan hanya untuk `PENDING`/`CONFIRMED` dan tunduk pada batas jam pembatalan.
- Pencegahan bentrok:
  1. Transaksi database dengan `pg_advisory_xact_lock` per setup, sehingga request bersamaan diserialisasi.
  2. Pengecekan overlap di dalam transaksi.
  3. Exclusion constraint PostgreSQL `Booking_no_overlapping_slots` sebagai jaring pengaman terakhir.
- Sesi berjalan otomatis setelah check-in:
  - Sesi menjadi `ACTIVE` saat jam mulai booking tiba (`startedAt` = jam mulai, atau jam check-in jika pelanggan datang terlambat).
  - Sesi selalu menjadi `COMPLETED` tepat pada jam selesai booking (`completedAt` = `endAt`), jadi kedatangan terlambat memotong sisa waktu bermain.
  - Booking yang tidak pernah check-in (`PENDING`/`CONFIRMED`) **tidak** diselesaikan otomatis; no-show tetap ditangani staff.
  - Check-in atau mulai sesi setelah jam selesai ditolak server.
- Sinkronisasi otomatis dijalankan saat halaman admin, dashboard pelanggan, detail booking, dan ketersediaan slot dimuat. Halaman admin juga menyegarkan data setiap 60 detik.
- Waktu disimpan sebagai `timestamptz` (UTC) dan ditampilkan sesuai zona waktu lounge (`Asia/Jakarta` secara default).
- Koneksi Prisma memakai sesi UTC (`options: "-c timezone=UTC"`). Ini mencegah pergeseran `timestamptz` akibat zona waktu server database yang berbeda; tampilan tetap dikonversi ke zona lounge.

Alur status:

```text
PENDING ──► CONFIRMED ──► CHECKED_IN ──► ACTIVE ──► COMPLETED
   │            │             │
   ├─► EXPIRED  ├─► CANCELLED ├─► CANCELLED
   └─► CANCELLED└─► COMPLETED └─► COMPLETED
```

## Nomor referensi & pembayaran

**Nomor referensi**

- Dibuat otomatis oleh server saat booking dibuat: `LVL-YYMMDD-XXXXXXXX` (contoh `LVL-261029-K7P9X4M2`).
- `YYMMDD` mengikuti tanggal sesi pada zona waktu lounge. Delapan karakter terakhir memakai `crypto.randomBytes` dan alfabet tanpa karakter ambigu (`I`, `O`, `0`, `1`).
- Kolom `Booking.code` memiliki `UNIQUE`; jika terjadi tabrakan, server mencoba ulang maksimal 3 kali.
- Nomor tidak pernah dibuat ulang saat halaman di-refresh atau status berubah. Booking lama dengan format lama tetap dipertahankan dan tidak dihapus/diubah paksa.

**Metode pembayaran**

| Metode | Status booking saat dibuat | Status pembayaran awal | Verifikasi |
| --- | --- | --- | --- |
| Transfer Bank | `PENDING` + batas pembayaran | `UNPAID` | Staff memverifikasi dana masuk |
| QRIS | `PENDING` + batas pembayaran | `UNPAID` | Staff memverifikasi pembayaran QRIS |
| Bayar di Tempat | `CONFIRMED` (slot langsung diamankan) | `UNPAID` | Staff mengonfirmasi setelah uang diterima di kasir |

- Memilih metode **tidak** membuat pembayaran menjadi lunas. Hanya aksi verifikasi staff yang mengubah `Payment.status` menjadi `VERIFIED`.
- QRIS tidak dianggap lunas hanya karena pelanggan membuka halaman atau menekan tombol. Nominal selalu dicek terhadap `Booking.totalPrice` di server.
- Referensi pembayaran (`Payment.transactionRef`) unik; referensi yang sudah dipakai booking lain ditolak.
- Booking Bayar di Tempat tetap terlindungi dari double-booking. Jika pelanggan tidak datang, staff dapat membatalkan booking; slot tidak dilepas otomatis sebelum dibatalkan.
- Verifikasi pembayaran terlindungi role `STAFF`/`ADMIN` dan dicatat di `AuditLog` (`payment.verified`).

**QRIS tanpa payment gateway**

Saat ini tidak ada kredensial payment gateway/QRIS dinamis. Alur yang aktif adalah **verifikasi manual oleh staff**:

- Jika `NEXT_PUBLIC_QRIS_IMAGE_URL` diisi dengan gambar QRIS statis resmi merchant, halaman booking menampilkan gambar tersebut.
- Jika belum diisi, halaman hanya menampilkan instruksi untuk memindai QRIS resmi di kasir. Tidak ada QR buatan atau QR yang tidak terhubung ke pembayaran.
- Webhook gateway belum tersedia. Jika nanti memakai gateway, tambahkan verifikasi signature dan idempotency di server sebelum mengubah status pembayaran.

## Keamanan

- Password di-hash bcrypt (cost 12).
- Sesi berupa JWT HS256 di cookie `HttpOnly`, `SameSite=Lax`, `Secure` di production, dengan masa berlaku terbatas.
- Role dibaca ulang dari database pada setiap request, sehingga token lama tidak dapat mempertahankan akses yang sudah dicabut.
- Server action memeriksa ulang otorisasi; `/admin/users` dan `/admin/settings` hanya untuk `ADMIN`.
- Admin tidak dapat menurunkan role akunnya sendiri, dan sistem menolak menghapus admin terakhir.
- Semua perubahan penting dicatat di `AuditLog` (pembuatan booking, transisi status, verifikasi pembayaran, CRUD setup, perubahan role, pengaturan).
- Redirect setelah login dibatasi ke path relatif internal untuk mencegah open redirect.
- Harga, durasi, status, dan kepemilikan booking divalidasi ulang di server.

## Pengujian

```bash
npm test
```

Test terdiri dari:

- **Unit** — pricing, aturan transisi status, konversi waktu/slot, skema Zod, JWT/cookie/password, serta normalisasi nomor dan template pesan WhatsApp.
- **Integration** (database nyata) — pembuatan booking, penyimpanan nomor WhatsApp, bentrok slot, concurrency, constraint database, verifikasi pembayaran, ownership, pembatalan, cutoff, transisi status, expiry, serta otorisasi aksi admin dan CRUD setup/pengaturan/role.

Integration test memakai `DATABASE_URL` dari `.env`, membuat data unik, dan membersihkannya setelah selesai. Pastikan database development aktif dan migrasi sudah diterapkan sebelum menjalankan `npm test`.

Pemeriksaan lengkap sebelum deploy:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Struktur proyek

```text
app/
  (site)/                  # halaman publik: landing, setups, booking, auth, dashboard
  admin/                   # admin console (staff/admin)
  api/availability/        # endpoint ketersediaan slot
  globals.css              # token & utility Liquid Glass
src/
  actions/                 # server actions (auth, booking, admin)
  components/              # UI, layout, booking, dashboard, admin
  lib/
    auth/                  # session, password, guards
    booking/               # service + state machine
    validation/            # skema Zod
    pricing.ts, time.ts, settings.ts, db.ts
  generated/prisma/        # Prisma Client hasil generate (gitignored)
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  unit/                    # test murni
  integration/             # test dengan database
docs/
  DEPLOYMENT.md
  MIGRATIONS.md
  ADMIN.md
```

## Dokumentasi lanjutan

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploy ke Vercel dengan Prisma Postgres.
- [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) — alur Prisma Migrate, constraint bentrok, dan rollback.
- [`docs/ADMIN.md`](docs/ADMIN.md) — panduan operasional staff/admin.

## Troubleshooting

**`DATABASE_URL belum diatur` saat seed**
Salin `.env.example` menjadi `.env` dan isi `DATABASE_URL`.

**`Can't reach database server`**
Pastikan PostgreSQL berjalan dan port benar. Untuk cluster proyek, jalankan `npm run db:start` (atau `pg_ctl -D .pgdata -o "-p 55432" -l .pgdata/server.log start`) lalu cek dengan `npm run db:status`. Cluster ini tidak otomatis menyala setelah komputer reboot.

**Constraint `Booking_no_overlapping_slots` tidak ada**
Jalankan `npm run db:deploy`. Migrasi `20261029110430_booking_overlap_guard` membuat ekstensi `btree_gist` dan exclusion constraint.

**Test integration gagal karena data bentrok**
Test memakai email/slug unik, tetapi jika proses sebelumnya terhenti paksa, hapus data dengan prefix `test-setup-`/`@test.levelup` atau reset database development (`npm run db:reset`).

**Halaman gelap / gambar rusak saat dibuka lewat URL Network**
Next.js memblokir request dev dari origin selain `localhost` (mis. `http://192.168.1.4:3000`) agar aman. `next.config.ts` sudah mengizinkan hostname LAN umum (`192.168.*.*`, `*.local`). Jika IP perangkatmu di luar pola itu, tambahkan hostname-nya ke `allowedDevOrigins`, lalu restart `npm run dev` dan hard-refresh browser. Ini hanya berlaku di development; build produksi tidak terpengaruh.

**Build gagal karena `AUTH_SECRET`**
Set `AUTH_SECRET` minimal 32 karakter di environment build/deploy. Jangan memakai fallback development di production.
#   w e b s i t e - r e s e r v a s i - g a m e l o u n g e  
 