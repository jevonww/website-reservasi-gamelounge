# Deployment — Vercel + Prisma Postgres

Panduan ini menjelaskan cara men-deploy LEVELUP ke Vercel dengan Prisma Postgres sebagai database produksi. Jangan memakai Neon, Supabase, atau database lain sebagai pengganti Prisma Postgres pada jalur deploy yang didokumentasikan di sini.

> **Status:** deployment Vercel dan Prisma Postgres produksi **belum dijalankan**. Dokumen ini adalah persiapan. Jangan deploy sebelum pemilik project menyatakan project final dan menyediakan kredensial melalui cara yang aman.

## Ringkasan arsitektur

```text
Browser ──► Vercel (Next.js 16 App Router)
                 │
                 ├─ Server Components / Server Actions
                 ├─ API route /api/availability
                 └─ Prisma Client + @prisma/adapter-pg
                          │
                          ▼
                   Prisma Postgres
```

- Semua halaman yang membaca database bersifat dinamis (`force-dynamic`), sehingga data selalu segar.
- Migrasi dijalankan dengan Prisma Migrate (`prisma migrate deploy`), bukan `db push`.
- Seed produksi hanya membuat admin awal (dan melewati data demo).

## 1. Siapkan Prisma Postgres

1. Masuk ke [Prisma Console](https://console.prisma.io).
2. Buat project baru, lalu buat database (pilih region terdekat dengan pengguna, mis. Singapore).
3. Buka **Database → Connection string** dan salin connection string TCP.
4. Simpan connection string sebagai `DATABASE_URL` di tempat aman.

Bentuknya kurang lebih:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@db.prisma.io:5432/levelup?sslmode=require"
```

> Gunakan connection string yang disediakan Console apa adanya. Jangan mengarang host, user, atau password. Jika ada pilihan pooled/direct, gunakan string yang direkomendasikan Console untuk aplikasi serverless.

## 2. Siapkan project Vercel

1. Push repository ke GitHub/GitLab/Bitbucket.
2. Di Vercel, pilih **Add New → Project** dan import repository.
3. Tentukan **Root Directory** jika project berada di subfolder (mis. `website_reservasi/levelup-gamingpremiumlounge`).
4. Framework preset: **Next.js**.
5. Build command: `npm run build` (sudah menjalankan `prisma generate`).
6. Install command: `npm install`.
7. Node.js version: 20 atau 22.

### Environment variables Vercel

Tambahkan untuk **Production**, **Preview**, dan **Development** sesuai kebutuhan:

| Key | Nilai |
| --- | --- |
| `DATABASE_URL` | Connection string Prisma Postgres. |
| `AUTH_SECRET` | String acak minimal 32 karakter (gunakan yang berbeda dari lokal). |
| `NEXT_PUBLIC_APP_URL` | URL produksi, mis. `https://levelup.id`. |
| `NEXT_PUBLIC_QRIS_IMAGE_URL` | Opsional. URL gambar QRIS statis resmi merchant. Kosongkan bila belum ada; jangan memakai QR buatan. |

Membuat `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Jangan menaruh `SEED_ADMIN_PASSWORD` di environment runtime Vercel jika tidak diperlukan. Variabel seed hanya dibutuhkan saat menjalankan seed secara manual.

### QRIS

Saat ini aplikasi **tidak** terhubung ke payment gateway QRIS dinamis. Status pembayaran QRIS diverifikasi manual oleh staff, dan gambar QR hanya ditampilkan jika `NEXT_PUBLIC_QRIS_IMAGE_URL` berisi gambar QRIS statis resmi dari merchant/acquirer. Jangan mengisi URL dengan QR contoh, QR palsu, atau QR yang tidak terhubung ke rekening lounge.

Jika nanti memakai gateway (mis. Midtrans/Xendit/DOMPet), yang perlu ditambahkan sebelum mengaktifkan pembayaran otomatis:

1. Kredensial server-side (API key) sebagai environment variable rahasia — jangan `NEXT_PUBLIC_*`.
2. Endpoint pembuatan transaksi QR dinamis yang menyimpan `providerReference` dan nominal di database.
3. Webhook dengan verifikasi signature, pengecekan nominal, dan idempotency (status `VERIFIED` tidak diproses dua kali).
4. Rekonsiliasi status saat halaman dimuat, bukan hanya mengandalkan webhook.
5. Audit log untuk setiap perubahan status pembayaran.

## 3. Terapkan migrasi

Migrasi harus dijalankan sebelum aplikasi produksi melayani traffic. Pilih salah satu pendekatan berikut.

### Opsi A — dari mesin lokal (disarankan untuk rilis pertama)

PowerShell:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@db.prisma.io:5432/levelup?sslmode=require"
npx prisma migrate deploy
```

Bash:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@db.prisma.io:5432/levelup?sslmode=require" npx prisma migrate deploy
```

Perintah ini hanya menerapkan migrasi yang belum tercatat di tabel `_prisma_migrations` dan tidak membuat migrasi baru.

### Opsi B — jadikan bagian dari build Vercel

Ubah build command menjadi:

```bash
prisma generate && prisma migrate deploy && next build
```

Ini praktis untuk tim kecil. Prisma Migrate menggunakan advisory lock sehingga dua build yang berjalan bersamaan tidak menerapkan migrasi yang sama dua kali. Untuk organisasi yang lebih besar, pisahkan migrasi ke pipeline/pre-deploy step tersendiri agar build tetap cepat dan tidak bergantung pada database.

### Opsi C — pipeline CI

Contoh langkah di GitHub Actions:

```yaml
- run: npm ci
- run: npx prisma generate
- run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Jalankan hanya untuk branch yang memang boleh mengubah skema produksi.

## 4. Buat admin produksi

Seed aman dijalankan untuk produksi karena data demo otomatis dilewati saat `NODE_ENV=production`, dan dapat dipaksa lewat `SEED_DEMO_DATA`.

```powershell
$env:DATABASE_URL="postgresql://…"
$env:SEED_ADMIN_EMAIL="admin@domain-anda.com"
$env:SEED_ADMIN_PASSWORD="Ganti-Dengan-Password-Kuat"
$env:SEED_DEMO_DATA="false"
npx prisma db seed
```

Seed bersifat idempotent terhadap email admin: jika admin dengan email tersebut sudah ada, seed tidak mengubah password. Untuk mengganti password, gunakan fitur reset password internal atau perbarui hash melalui prosedur operasional yang terkontrol.

Setelah login pertama:

1. Ganti password admin default.
2. Buat akun staff sesuai kebutuhan melalui `/admin/users` atau seed terpisah.
3. Atur jam operasional, durasi, rekening, dan kebijakan di `/admin/settings`.
4. Tambahkan setup nyata melalui `/admin/setups` (atau biarkan katalog demo jika memang sesuai).

## 5. Domain dan cookie

- Tambahkan custom domain di Vercel (mis. `levelup.id`) dan arahkan DNS sesuai instruksi Vercel.
- Set `NEXT_PUBLIC_APP_URL` ke URL final tersebut.
- Cookie sesi otomatis memakai `Secure` saat `NODE_ENV=production`. Pastikan situs diakses lewat HTTPS.
- Jika memakai domain ganda (www dan non-www), pilih satu sebagai canonical dan redirect yang lain.

## 6. Checklist setelah deploy

- [ ] `https://domain/` menampilkan landing page tanpa error.
- [ ] `/setups` menampilkan setup dari database produksi.
- [ ] Registrasi akun baru berhasil dan bisa login.
- [ ] Booking uji berhasil dibuat dan muncul di `/dashboard`.
- [ ] Admin dapat login dan melihat metrik nyata di `/admin`.
- [ ] Booking Transfer Bank/QRIS tetap `UNPAID` sampai staff memverifikasi.
- [ ] Verifikasi pembayaran mengubah status menjadi `CONFIRMED` dan `Payment.status` menjadi `VERIFIED`.
- [ ] Booking Bayar di Tempat dibuat `CONFIRMED` tetapi `Payment.status` tetap `UNPAID` sampai kasir mengonfirmasi.
- [ ] Filter status/metode pembayaran di `/admin/bookings` bekerja dan mempertahankan filter saat pindah halaman.
- [ ] Staff tidak dapat membuka `/admin/settings` atau `/admin/users`.
- [ ] `/admin/users` menampilkan pengguna dan perubahan role berfungsi.
- [ ] Booking `PENDING` kedaluwarsa dan slot kembali tersedia.
- [ ] Tidak ada error di Vercel Functions log.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build` lulus di CI.

## 7. Operasional produksi

### Log dan monitoring

- Pantau **Vercel → Logs** untuk error server action dan query database.
- Pantau Prisma Console untuk koneksi, storage, dan query lambat.
- Atur alert biaya/penggunaan sesuai kebutuhan.

### Backup

- Gunakan fitur backup Prisma Postgres atau ekspor `pg_dump` terjadwal.
- Uji restore secara berkala; backup yang belum pernah diuji restore belum bisa diandalkan.

### Scaling

- Prisma Client dibuat sekali per instance (global cache di development, per proses di production).
- Connection pooling ditangani Prisma Postgres / adapter; jangan menambahkan pooler lain tanpa memahami batas koneksi.
- Endpoint `/api/availability` dapat dipanggil sering oleh widget booking. Pantau latency-nya.

### Keamanan

- Rotasi `AUTH_SECRET` akan membatalkan semua sesi aktif (semua pengguna harus login ulang). Lakukan dengan sengaja.
- Jangan pernah menaruh `DATABASE_URL` atau `AUTH_SECRET` di kode, repo, screenshot, atau pesan publik.
- Batasi akses ke Prisma Console dan Vercel hanya untuk orang yang membutuhkan.
- Periksa audit log untuk aktivitas role/perubahan pengaturan yang tidak wajar.

## 8. Rollback

- **Aplikasi:** gunakan fitur rollback deployment Vercel ke deployment sebelumnya.
- **Database:** Prisma Migrate tidak menyediakan down migration otomatis. Buat migrasi maju (forward migration) yang mengembalikan perubahan, atau restore dari backup.
- Jangan mengedit migrasi yang sudah diterapkan di produksi.

Detail alur migrasi ada di [`MIGRATIONS.md`](MIGRATIONS.md).
