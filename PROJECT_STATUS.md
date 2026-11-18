# PROJECT STATUS — LEVELUP Gaming Lounge

Terakhir diperbarui: **17 November 2026**

## Ringkasan

Proyek berada pada tahap **selesai untuk audit dan verifikasi lokal**, dengan perubahan yang belum di-commit. Seluruh pemeriksaan kode yang tersedia lulus: typecheck, lint, 134 test, dan production build. Database lokal sudah sesuai dengan 4 migrasi yang ada dan tidak di-reset.

**Deployment Vercel belum dilakukan.** Deployment tetap ditahan sampai pemilik proyek menyatakan final dan memberi instruksi eksplisit. Database produksi Prisma Postgres juga belum dibuat karena kredensial belum tersedia.

| Area | Status |
| --- | --- |
| Kode aplikasi | Selesai untuk scope perbaikan saat ini |
| Typecheck | Lulus |
| Lint | Lulus, 0 error dan 0 warning |
| Test | 134/134 lulus di 11 file |
| Production build | Lulus |
| Database lokal | PostgreSQL `localhost:55432`, schema up to date |
| Database produksi | Belum dikonfigurasi |
| Deploy Vercel | Belum dilakukan, sengaja ditahan |
| QRIS dinamis | Belum ada gateway; memakai verifikasi manual staff |

## Stack

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16.4.3 (App Router, Turbopack) |
| UI | React 19.3, Tailwind CSS v4, Motion, Lucide |
| Bahasa | TypeScript strict |
| Validasi | Zod + React Hook Form |
| Database | PostgreSQL + Prisma ORM 7.10.1 (`@prisma/adapter-pg`) |
| Auth | bcryptjs + JWT HttpOnly bertanda tangan (`jose`) |
| Test | Vitest 5 |

## Pekerjaan yang sudah diselesaikan

### 1. Perbaikan navbar

- Label navigasi, login, register, logout, dan menu booking dilokalisasi ke bahasa Indonesia.
- Status aktif navbar memakai `aria-current` dan logika active-state yang benar.
- Menu mobile menutup saat klik di luar, menekan `Escape`, atau memilih tautan.
- Menu mobile dapat di-scroll dan tidak terpotong pada layar pendek.

### 2. Polish halaman login dan register

- Layout auth dua kolom yang responsif dengan panel highlight dan visual premium.
- Label, teks bantuan, pesan error, dan status loading memakai bahasa Indonesia.
- Toggle lihat/sembunyikan password terpisah untuk password dan konfirmasi password.
- Input dinonaktifkan saat proses berjalan, autofocus, atribut `aria-invalid`, dan pesan error yang dapat dibaca screen reader.
- Petunjuk kekuatan/ketentuan password ditampilkan sebelum submit.
- Ikon input tidak lagi menutupi teks; utility padding kini menang atas style komponen `.field`.

### 3. Metode pembayaran

Tersedia tiga metode di checkout:

| Metode | Status booking saat dibuat | Status pembayaran saat dibuat | Batas pembayaran |
| --- | --- | --- | --- |
| Transfer Bank | `PENDING` | `UNPAID` | Ya |
| QRIS | `PENDING` | `UNPAID` | Ya |
| Bayar di Tempat | `CONFIRMED` | `UNPAID` | Tidak ada |

- Checkout memakai radiogroup yang dapat diakses keyboard dan menampilkan konsekuensi tiap metode.
- Halaman detail booking menampilkan metode, status pembayaran, nominal, nomor referensi, dan instruksi sesuai metode.
- Dashboard dan metrik admin menghitung booking tunai yang belum dibayar sebagai pembayaran tertunda.

### 4. QRIS

- **Tidak ada QR palsu.** Aplikasi tidak pernah membuat gambar QR sendiri.
- QR hanya ditampilkan jika `NEXT_PUBLIC_QRIS_IMAGE_URL` diisi dengan gambar QRIS statis resmi milik merchant/acquirer.
- Jika variabel tersebut kosong, halaman hanya menampilkan instruksi pembayaran dan permintaan verifikasi staff.
- Pembayaran QRIS **tidak pernah** otomatis menjadi lunas. Staff wajib memverifikasi dana yang benar-benar diterima.
- Nominal diverifikasi di server terhadap total booking, bukan hanya dari input klien.
- Pembayaran `VERIFIED` atau `REFUNDED` tidak dapat diverifikasi ulang.
- Referensi transaksi dicek duplikatnya di dalam transaksi database agar tidak dipakai dua booking.

### 5. Bayar di Tempat

- Slot langsung diamankan dengan status booking `CONFIRMED`.
- `Payment.status` tetap `UNPAID` sampai staff mencatat uang tunai diterima.
- Tidak ada `paymentExpiresAt`, sehingga slot tunai yang valid tidak dilepas otomatis.
- Staff dapat mengonfirmasi pembayaran saat booking berstatus `PENDING`, `CONFIRMED`, `CHECKED_IN`, `ACTIVE`, atau `COMPLETED` (khusus tunai).
- Verifikasi tidak menurunkan status sesi yang sudah check-in/aktif menjadi `CONFIRMED`.
- Status final `COMPLETED`, `CANCELLED`, dan `EXPIRED` ditolak.
- Referensi nota memakai nomor referensi booking sebagai nilai awal dan dapat disesuaikan staff.

### 6. Nomor referensi booking

Format baru: **`LVL-YYMMDD-XXXXXXXX`**

- `YYMMDD` dihitung dari tanggal mulai booking di zona waktu lounge.
- `XXXXXXXX` berisi 8 karakter dari alfabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (tanpa karakter ambigu I, O, 0, 1).
- Suffix dibuat dengan `crypto.randomBytes`, bukan `Math.random`.
- Nomor dibuat dan disimpan sekali di server saat booking dibuat.
- Kolom `Booking.code` memiliki constraint unik di database.
- Pembuatan ulang maksimal 3 kali jika terjadi collision, lalu error yang jelas jika tetap gagal.
- Nomor tidak berubah saat refresh, perubahan status, verifikasi pembayaran, check-in, atau penyelesaian sesi.
- Booking lama dengan format referensi sebelumnya **tidak diubah** dan tetap dapat dibuka.

### 7. Admin dan verifikasi pembayaran

- Filter booking admin mendukung status booking, status pembayaran, metode pembayaran, tanggal, dan pencarian.
- Filter disusun ulang menjadi dua baris dengan label yang jelas, sehingga select tidak terpotong pada desktop maupun mobile.
- Filter status pembayaran dan metode pembayaran dapat dikombinasikan.
- Filter pembayaran ikut dihitung dalam `hasFilters` dan dipertahankan saat pagination.
- Pencarian mencakup nomor referensi booking, referensi pembayaran, nama/email pelanggan, dan nama setup.
- Tabel dan detail booking menampilkan label metode pembayaran yang benar.
- Panel verifikasi menyesuaikan judul, deskripsi, dan tombol untuk transfer, QRIS, dan tunai.
- Verifikasi hanya dapat dilakukan `STAFF` atau `ADMIN`; customer tidak dapat mengubah status pembayaran.
- Audit log mencatat `payment.verified` beserta nominal, metode, referensi, dan status booking sebelumnya.

### 8. Dokumentasi

- `README.md`: metode pembayaran, status environment, referensi, dan QRIS manual.
- `docs/ADMIN.md`: alur verifikasi transfer/QRIS/tunai dan pengecualian status.
- `docs/DEPLOYMENT.md`: langkah persiapan Vercel/Prisma Postgres dan batasan QRIS.
- `.env.example`: variabel QRIS opsional dan peringatan agar tidak memakai QR palsu.
- `PROJECT_STATUS.md`: dokumen ini.

### 9. Konfirmasi WhatsApp dan script database

- Detail booking admin memiliki panel **Konfirmasi via WhatsApp** dengan nomor pelanggan terisi otomatis dari profil.
- Checkout mewajibkan nomor WhatsApp; nomor divalidasi dan disimpan ke profil pelanggan dalam transaksi yang sama dengan pembuatan booking.
- Nomor dapat diganti staff bila pelanggan memberi nomor lain; nomor divalidasi dan dinormalisasi ke format `wa.me` (`08xx`, `62xx`, `+62xx`).
- Tiga template pesan: konfirmasi booking, pengingat pembayaran, dan pembatalan. Teks dapat diedit sebelum dikirim.
- Pesan memuat kode booking, setup, jadwal, durasi, total, metode/status pembayaran, alamat, dan tautan booking publik (tautan `localhost` tidak disertakan).
- Fitur memakai tautan klik-untuk-chat `wa.me`, bukan WhatsApp API: tidak ada pesan otomatis dan tidak perlu kredensial tambahan.
- `npm run db:start`, `npm run db:stop`, dan `npm run db:status` mengelola cluster PostgreSQL lokal di `.pgdata` dan membaca port dari `DATABASE_URL`.

### 10. Otomasi sesi sesuai jadwal

- `syncScheduledSessions()` memajukan status booking berdasarkan waktu booking dan dipanggil saat halaman admin, dashboard pelanggan, detail booking, dan ketersediaan slot dimuat.
- `CHECKED_IN` otomatis menjadi `ACTIVE` saat `startAt` tiba; `startedAt` memakai waktu check-in bila pelanggan datang terlambat.
- `CHECKED_IN`/`ACTIVE` otomatis menjadi `COMPLETED` tepat pada `endAt`, sehingga sesi selalu selesai sesuai jam booking dan keterlambatan memotong sisa waktu.
- Booking `PENDING`/`CONFIRMED` yang tidak check-in tidak diubah (no-show tetap ditangani staff).
- Check-in atau mulai sesi setelah `endAt` ditolak server.
- Setiap perubahan otomatis dicatat di audit log sebagai `booking.auto_started` / `booking.auto_completed` dengan actor `Sistem`.
- Halaman admin menyegarkan data setiap 60 detik agar status otomatis terlihat tanpa reload manual.
- Verifikasi pembayaran tunai tetap diizinkan setelah sesi selesai otomatis (`COMPLETED`).

### 11. Perbaikan zona waktu koneksi database

- Ditemukan bahwa `@prisma/adapter-pg` mengganti offset `timestamptz` menjadi `+00:00` saat membaca, dan menulis komponen UTC tanpa offset. Jika sesi PostgreSQL memakai zona non-UTC (server lokal: `Asia/Bangkok`), `startAt`/`endAt` bergeser 7 jam — otomasi sesi jadi terlambat dan jadwal tampil salah.
- Perbaikan: koneksi Prisma di `src/lib/db.ts` dan `prisma/seed.ts` memakai `options: "-c timezone=UTC"`, sehingga baca/tulis `timestamptz` tepat dan konsisten di server mana pun.
- Regression test membandingkan epoch tersimpan di database dengan waktu input, bukan hanya hasil baca Prisma.
- Satu booking aktif yang dibuat sebelum perbaikan (`LVL-261117-MRXY7FWH`) direparasi manual ke jadwal sebenarnya (14:00–15:00 WIB) setelah sebelumnya sempat terselesaikan otomatis karena data waktu yang bergeser.

## Hasil verifikasi

Dijalankan pada 17 November 2026 dari folder `levelup-gamingpremiumlounge`:

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | Lulus tanpa error |
| `npm run lint` | Lulus, 0 error dan 0 warning |
| `npm test` | **134 test lulus** dari 11 file |
| `npm run build` | Lulus; seluruh route utama bersifat dinamis |
| `npx prisma migrate status` | Database schema up to date; 4 migrasi ditemukan |

Peringatan `pg` tentang pemanggilan query bersamaan saat test muncul dari driver, bukan kegagalan test. Tidak ada test yang gagal.

## Cakupan test

Test baru dan test yang diperluas mencakup:

- Format, prefix tanggal, alfabet, dan keunikan nomor referensi.
- Validasi metode pembayaran `BANK_TRANSFER`, `QRIS`, dan `CASH`.
- Booking QRIS tetap `UNPAID` setelah dibuat.
- Booking tunai langsung `CONFIRMED` tetapi pembayaran tetap `UNPAID` tanpa batas pembayaran.
- Nomor referensi tetap sama setelah refresh/verifikasi.
- Verifikasi pembayaran tunai setelah check-in tanpa menurunkan status sesi.
- Penolakan referensi pembayaran duplikat.
- Customer tidak dapat memverifikasi pembayaran.
- Staff dapat memverifikasi QRIS dan tunai.
- Pembayaran yang sama tidak dapat diverifikasi dua kali.
- Normalisasi nomor WhatsApp (`08xx`, `62xx`, `+62xx`, format internasional) dan penolakan nomor tidak valid.
- Template konfirmasi, pengingat pembayaran, dan pembatalan WhatsApp.
- Tautan booking publik tidak dibuat untuk `localhost`.
- Nomor WhatsApp checkout tersimpan ke profil pelanggan dan nomor tidak valid ditolak.
- Sesi `CHECKED_IN` otomatis menjadi `ACTIVE` pada jam booking dan mencatat audit `booking.auto_started`.
- Kedatangan terlambat memakai waktu check-in sebagai `startedAt` tetapi `endAt` tetap, sehingga sisa waktu terpotong.
- Sesi otomatis menjadi `COMPLETED` tepat pada `endAt`; sesi yang sudah lewat tidak dimulai terlebih dahulu.
- No-show `CONFIRMED` tidak diubah otomatis.
- Check-in setelah jam selesai ditolak dengan `INVALID_STATUS`.
- Verifikasi pembayaran tunai tetap berhasil setelah sesi selesai otomatis.
- Waktu booking yang tersimpan di database sama persis dengan waktu input (tidak bergeser oleh zona waktu sesi database).

Integration test memakai database PostgreSQL lokal dan membersihkan data uji setelah selesai.

## Database dan migrasi

- Database lokal: PostgreSQL port `55432`, database `levelup`.
- Migrasi: `20261029110347_init`, `20261029110430_booking_overlap_guard`, `20261106120000_add_username`, dan `20261106130000_add_setup_images`.
- Tidak ada migrasi baru untuk konfirmasi WhatsApp karena fitur memakai tautan `wa.me` dan data yang sudah ada (nama, telepon, detail booking).
- Tidak ada reset database, penghapusan data, atau perubahan migrasi lama.
- Kondisi data lokal saat audit: 1 booking lama dengan format referensi sebelumnya dan 1 pembayaran `VERIFIED`. Data lama dipertahankan.
- Database produksi Prisma Postgres belum dibuat dan belum menerima migrasi.

## File utama yang berubah

| File | Perubahan |
| --- | --- |
| `src/lib/db.ts` | Sesi PostgreSQL dipaksa UTC agar baca/tulis `timestamptz` tidak bergeser |
| `src/lib/booking/service.ts` | Generator referensi acak, alur tunai, verifikasi pembayaran, proteksi duplikat, otomasi sesi `syncScheduledSessions` |
| `src/components/admin/AutoRefresh.tsx` | Refresh halaman admin tiap 60 detik agar status otomatis terlihat |
| `src/actions/bookings.ts` | Validasi dan otorisasi aksi verifikasi pembayaran |
| `src/lib/validation/schemas.ts` | Validasi metode pembayaran |
| `src/lib/constants.ts` | Label dan deskripsi metode pembayaran |
| `src/components/booking/CheckoutForm.tsx` | Pemilihan metode dan pesan konsekuensi |
| `app/(site)/booking/[code]/page.tsx` | Instruksi pembayaran per metode dan QRIS opsional |
| `app/(site)/booking/checkout/page.tsx` | Penjelasan metode pembayaran |
| `src/components/admin/AdminBookingFilters.tsx` | Filter dua baris, label jelas, status/metode pembayaran yang dapat dikombinasikan |
| `src/components/admin/BookingManagePanel.tsx` | UI verifikasi transfer, QRIS, dan tunai |
| `app/admin/bookings/page.tsx` | Filter, label metode, pencarian referensi pembayaran |
| `app/admin/bookings/[id]/page.tsx` | Data metode/status pembayaran pada detail |
| `src/components/layout/GlassNavbar.tsx` | Perbaikan navbar desktop/mobile |
| `app/(auth)/layout.tsx` | Layout auth responsif |
| `src/components/auth/AuthForm.tsx` | Polish form login/register |
| `app/globals.css` | Style `.field` dipindah ke layer komponen agar utility padding/lebar bekerja |
| `src/lib/whatsapp.ts` | Normalisasi nomor, tautan `wa.me`, template pesan, tautan booking publik |
| `src/components/admin/WhatsAppConfirmPanel.tsx` | Panel konfirmasi WhatsApp dengan nomor & teks yang dapat diedit |
| `scripts/db.mjs`, `package.json` | Script `db:start`, `db:stop`, dan `db:status` untuk cluster lokal |
| `tests/unit/whatsapp.test.ts` | 17 test normalisasi nomor, tautan, template, dan pesan WhatsApp |
| `README.md`, `docs/ADMIN.md`, `docs/DEPLOYMENT.md`, `.env.example` | Dokumentasi dan konfigurasi |

## Yang belum terverifikasi atau belum tersedia

- **Gateway QRIS dinamis:** belum terintegrasi. Belum ada pembuatan QR dinamis, webhook signature, rekonsiliasi otomatis, atau refund otomatis.
- **Gambar QRIS resmi:** belum diisi karena belum ada aset resmi dari merchant. Jangan memakai QR contoh/palsu.
- **Database produksi:** belum ada; connection string produksi tidak boleh dikarang.
- **Deployment Vercel:** belum dijalankan dan belum ada project Vercel yang dibuat untuk rilis ini.
- **Pengujian visual browser formal:** belum ada test end-to-end browser otomatis atau uji lintas perangkat fisik.
- **Load test dan penetration test:** belum dilakukan.
- **Notifikasi WhatsApp otomatis:** belum tersedia karena belum ada WhatsApp Business API/kredensial. Yang tersedia adalah konfirmasi klik-untuk-chat dari admin ke nomor pelanggan.
- **Notifikasi email:** belum tersedia.

## Langkah berikutnya

1. Review perubahan secara lokal dengan `npm run dev`.
2. Uji manual alur transfer, QRIS, dan tunai memakai akun staff/admin.
3. Uji panel **Konfirmasi via WhatsApp** pada detail booking, termasuk pelanggan tanpa nomor telepon.
3. Jika merchant menyediakan QRIS statis resmi, isi `NEXT_PUBLIC_QRIS_IMAGE_URL`; jika tidak, pertahankan verifikasi manual.
4. Setujui dan commit perubahan bila sudah final.
5. Siapkan Prisma Postgres produksi, isi environment Vercel dengan aman, lalu jalankan `prisma migrate deploy` sebelum rilis.
6. Deploy Vercel **hanya setelah** pemilik proyek memberi instruksi final secara eksplisit.

## Aturan deployment

Jangan deploy ke Vercel, membuat project Vercel, mengubah domain/DNS, atau mengisi environment produksi sebelum pemilik proyek menyatakan:

> **PROJECT SUDAH FINAL, SIAP DEPLOY VERCEL**

Sampai instruksi itu diberikan, status proyek adalah **siap diverifikasi secara lokal, deployment ditahan**.
