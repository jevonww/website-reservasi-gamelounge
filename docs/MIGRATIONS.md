# Migrasi Database

Project ini memakai **Prisma Migrate** dengan PostgreSQL/Prisma Postgres. Skema berada di `prisma/schema.prisma`, konfigurasi CLI di `prisma.config.ts`, dan riwayat migrasi di `prisma/migrations/`.

## Perintah penting

| Perintah | Kapan dipakai |
| --- | --- |
| `npm run db:migrate` (`prisma migrate dev`) | Development: membuat dan menerapkan migrasi baru, lalu generate client. |
| `npm run db:deploy` (`prisma migrate deploy`) | CI/production: hanya menerapkan migrasi yang sudah ada. |
| `npm run db:generate` | Generate ulang Prisma Client setelah perubahan skema. |
| `npm run db:seed` | Menjalankan `prisma/seed.ts`. |
| `npm run db:reset` | **Menghapus** database development, menerapkan ulang semua migrasi, lalu seed. Jangan pernah di production. |
| `npm run db:studio` | Membuka Prisma Studio. |

## Alur development

1. Ubah `prisma/schema.prisma`.
2. Buat migrasi dengan nama yang deskriptif:

   ```bash
   npx prisma migrate dev --name tambah_kolom_foo
   ```

   Atau lewat script:

   ```bash
   npm run db:migrate -- --name tambah_kolom_foo
   ```

3. Periksa file SQL yang dihasilkan di `prisma/migrations/<timestamp>_tambah_kolom_foo/migration.sql`.
4. Commit perubahan skema **dan** folder migrasi.
5. Jalankan test:

   ```bash
   npm run typecheck
   npm test
   ```

### Aturan

- Jangan mengedit migrasi yang sudah pernah diterapkan/di-commit ke branch bersama.
- Jangan memakai `prisma db push` untuk produksi; gunakan migrasi.
- Satu migrasi sebaiknya fokus pada satu perubahan logis.
- Perubahan destruktif (drop kolom/tabel) harus melalui pola expand → migrate → contract agar deploy tidak mematahkan versi lama.

## Alur production

```bash
npx prisma migrate deploy
```

Perintah ini:

- Membaca semua folder di `prisma/migrations`.
- Membandingkan dengan tabel `_prisma_migrations`.
- Menerapkan migrasi yang belum ada, dalam urutan nama.
- Tidak membuat migrasi baru dan tidak melakukan reset.

Jangan menjalankan `prisma migrate dev`, `prisma migrate reset`, atau `prisma db push` terhadap database produksi.

## Migrasi yang sudah ada

### `20261029110347_init`

Membuat enum dan tabel inti: `User`, `Setup`, `Booking`, `Payment`, `Review`, `LoungeSettings`, `AuditLog`, beserta index.

### `20261029110430_booking_overlap_guard`

Proteksi bentrok jadwal di level database:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_no_overlapping_slots"
EXCLUDE USING gist (
  "setupId" WITH =,
  tstzrange("startAt", "endAt", '[)') WITH &&
)
WHERE (
  "status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'ACTIVE')
);
```

Arti:

- Hanya booking berstatus aktif yang dihitung.
- Dua booking pada setup yang sama tidak boleh memiliki rentang waktu yang beririsan.
- `[)` berarti akhir sesi tidak dianggap bentrok dengan awal sesi berikutnya, sehingga booking 10:00–11:00 dan 11:00–12:00 diperbolehkan.
- Booking `CANCELLED`, `EXPIRED`, dan `COMPLETED` tidak diblokir, sehingga slot bisa dipakai ulang.

Aplikasi juga memakai `pg_advisory_xact_lock(hashtextextended(setupId, 0))` di dalam transaksi pembuatan booking. Lock ini menyerialkan request bersamaan; exclusion constraint menjadi jaring pengaman terakhir jika ada jalur tulis lain.

### Verifikasi constraint

```sql
-- Harus ada satu baris:
SELECT conname
FROM pg_constraint
WHERE conname = 'Booking_no_overlapping_slots';

-- Harus ada ekstensi btree_gist:
SELECT extname
FROM pg_extension
WHERE extname = 'btree_gist';
```

Jika migrasi sudah tercatat tetapi constraint hilang (mis. restore database lama), buat migrasi baru yang menambahkan kembali constraint tersebut. Jangan menyunting migrasi lama.

## Mengubah aturan bentrok

Contoh: ingin mengizinkan booking `COMPLETED` tetap memblokir slot historis (biasanya tidak perlu). Buat migrasi baru:

1. `DROP CONSTRAINT "Booking_no_overlapping_slots";`
2. Tambahkan kembali dengan predikat status yang baru.
3. Uji dengan dua transaksi bersamaan di staging.

Selalu uji di staging dengan volume dan pola akses yang mirip produksi.

## Backup sebelum migrasi berisiko

Sebelum migrasi yang mengubah/menghapus kolom:

1. Ambil backup Prisma Postgres (Console) atau `pg_dump`.
2. Simpan hash migrasi dan versi aplikasi.
3. Terapkan di staging.
4. Siapkan rencana rollback: migrasi maju (bukan edit migrasi lama) atau restore backup.

## Baseline database yang sudah berisi data

Jika database produksi sudah memiliki tabel tetapi belum punya riwayat migrasi:

1. Backup database.
2. Pastikan skema aktual sama dengan `schema.prisma`.
3. Tandai migrasi awal sebagai sudah diterapkan:

   ```bash
   npx prisma migrate resolve --applied 20261029110347_init
   npx prisma migrate resolve --applied 20261029110430_booking_overlap_guard
   ```

4. Jalankan `npx prisma migrate deploy` untuk memastikan tidak ada migrasi tertinggal.
5. Verifikasi constraint dan index.

Lakukan baseline hanya setelah skema benar-benar cocok; jika tidak, migrasi berikutnya bisa gagal atau merusak data.

## Seed

`prisma/seed.ts` melakukan:

- Upsert baris `LoungeSettings` dengan id `default`.
- Membuat admin dari `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` jika belum ada.
- Membuat customer dan setup demo hanya jika `SEED_DEMO_DATA` aktif. Di `NODE_ENV=production`, data demo dilewati kecuali `SEED_DEMO_DATA="true"`.

Seed tidak menghapus data yang sudah ada.

## Troubleshooting

**`P3005: The database schema is not empty`**
Database punya tabel tetapi belum punya riwayat migrasi. Lakukan baseline (lihat di atas) atau gunakan database kosong.

**`P3009: migrate found failed migrations`**
Periksa `_prisma_migrations`, perbaiki penyebabnya, lalu tandai migrasi gagal sebagai resolved/rolled-back sesuai kondisinya. Jangan langsung reset produksi.

**`extension "btree_gist" is not available`**
Prisma Postgres menyediakan `btree_gist`. Untuk PostgreSQL lokal, pasang paket kontribusi (`postgresql-contrib`) atau gunakan image resmi yang sudah menyertakannya.

**`23P01` saat insert booking**
Ini adalah exclusion constraint yang bekerja. Aplikasi menangkapnya dan mengembalikan pesan slot sudah dipesan. Jika muncul pada data yang seharusnya tidak bentrok, periksa timezone dan nilai `startAt`/`endAt`.

**Constraint bentrok dengan data lama**
Jika database berisi booking aktif yang saling tumpang tindih, migrasi constraint akan gagal. Bersihkan/expire data tersebut terlebih dahulu, atau jadwalkan perbaikan data sebelum migrasi.
