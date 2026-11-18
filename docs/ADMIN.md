# Panduan Admin & Staff

Panduan operasional untuk mengelola LEVELUP melalui admin console. Akses staff: `/admin`. Akses khusus admin: `/admin/users` dan `/admin/settings`.

## Peran dan akses

| Peran | Akses |
| --- | --- |
| `CUSTOMER` | Katalog, booking, dashboard dan profil sendiri. |
| `STAFF` | Semua akses operasional: overview, bookings, setups. Tidak dapat mengubah pengguna atau pengaturan lounge. |
| `ADMIN` | Semua akses staff ditambah manajemen pengguna dan pengaturan. |

Role dibaca ulang dari database pada setiap request. Jika role seseorang diturunkan, akses barunya berlaku pada request berikutnya tanpa perlu logout paksa.

## Login dan keamanan akun

- Gunakan akun pribadi; jangan berbagi kredensial antar staff.
- Segera ganti password default setelah instalasi.
- Admin tidak dapat mengubah role akunnya sendiri. Ini mencegah admin tidak sengaja mengunci diri.
- Sistem menolak menurunkan admin terakhir; selalu sisakan minimal satu admin.
- Semua aksi penting tercatat di audit log.

## Overview (`/admin`)

Metrik dihitung langsung dari database:

| Metrik | Definisi |
| --- | --- |
| Total booking | Seluruh booking, semua status. |
| Booking hari ini | Booking yang `startAt`-nya jatuh pada hari ini di zona waktu lounge. |
| Menunggu pembayaran | Booking `PENDING`/`CONFIRMED` yang pembayarannya belum `VERIFIED` (termasuk Bayar di Tempat). |
| Sesi aktif | Booking `CHECKED_IN` atau `ACTIVE`. |
| Pendapatan terverifikasi | Jumlah `Payment.amount` dengan status `VERIFIED`. Bukan estimasi. |
| Utilisasi hari ini | Total menit terpesan hari ini dibagi kapasitas jam operasional × jumlah setup tersedia. |
| Grafik 7 hari | Jumlah booking berdasarkan `createdAt` per hari lounge. |

Booking `PENDING` yang melewati batas pembayaran otomatis menjadi `EXPIRED` saat halaman terkait dimuat atau saat staff menekan **Rilis kedaluwarsa**.

## Mengelola booking (`/admin/bookings`)

Gunakan pencarian untuk nomor referensi booking, referensi pembayaran, nama/email pelanggan, atau nama setup. Filter status booking, status pembayaran, metode pembayaran, dan tanggal membantu menyiapkan operasional harian. Filter dipertahankan saat berpindah halaman.

### Alur status

```text
PENDING ──► CONFIRMED ──► CHECKED_IN ──► ACTIVE ──► COMPLETED
```

- **PENDING** — booking Transfer Bank/QRIS dibuat, menunggu pembayaran.
- **CONFIRMED** — pembayaran sudah diverifikasi, **atau** booking Bayar di Tempat sudah dikonfirmasi tetapi pembayaran belum dicatat. Cek `Payment.status` untuk membedakan.
- **CHECKED_IN** — pelanggan sudah tiba di lounge.
- **ACTIVE** — sesi sedang berjalan.
- **COMPLETED** — sesi selesai.
- **CANCELLED** — dibatalkan pelanggan/staff.
- **EXPIRED** — batas pembayaran terlewat; slot dilepas.

Transisi di luar alur akan ditolak server. Status `COMPLETED`, `CANCELLED`, dan `EXPIRED` bersifat final.

Setelah pelanggan check-in, dua transisi berikut berjalan **otomatis** mengikuti jadwal booking:

- `CHECKED_IN → ACTIVE` saat jam mulai tiba. Jika pelanggan datang terlambat, `startedAt` memakai jam check-in, bukan jam mulai booking.
- `ACTIVE` (atau `CHECKED_IN` yang terlewat) `→ COMPLETED` tepat pada jam selesai booking. Jam selesai **tidak pernah bergeser**, sehingga kedatangan terlambat memotong sisa waktu.

Booking `PENDING`/`CONFIRMED` yang tidak pernah check-in tidak diubah otomatis supaya no-show tetap terlihat dan bisa ditangani staff. Check-in atau mulai sesi setelah jam selesai akan ditolak server.

### Verifikasi pembayaran

**Transfer Bank / QRIS**

1. Buka detail booking.
2. Pastikan dana sebesar **total booking** benar-benar sudah masuk (mutasi rekening atau riwayat QRIS merchant).
3. Isi referensi transaksi (nomor referensi bank / ID transaksi QRIS).
4. Klik **Verifikasi pembayaran**.

**Bayar di Tempat**

1. Cari booking memakai nomor referensi saat pelanggan datang.
2. Lakukan check-in jika sesuai.
3. Setelah uang diterima di kasir, isi referensi nota (default memakai nomor referensi booking) dan klik **Konfirmasi pembayaran diterima**.
4. Status booking tetap `CONFIRMED`/`CHECKED_IN`/`ACTIVE`/`COMPLETED`; status pembayaran berubah menjadi `VERIFIED` tanpa menurunkan status sesi. Verifikasi tetap diizinkan setelah sesi selesai otomatis, selama uang tunai benar-benar sudah diterima.

Sistem menolak verifikasi jika:

- Nominal pembayaran tidak sama dengan total booking.
- Pembayaran sudah `VERIFIED` atau `REFUNDED` (mencegah proses ganda).
- Booking Transfer/QRIS bukan `PENDING`.
- Status booking Bayar di Tempat sudah final (`CANCELLED`, `EXPIRED`, `COMPLETED`).
- Referensi transaksi kosong, terlalu pendek, atau sudah dipakai booking lain.

Jangan menekan tombol verifikasi sebelum pembayaran benar-benar diterima. Setelah verifikasi, booking Transfer/QRIS otomatis menjadi `CONFIRMED`; booking Bayar di Tempat mempertahankan status sesi yang sedang berjalan.

### Check-in dan sesi

- **Check-in pelanggan** — dari `CONFIRMED` ke `CHECKED_IN`. Ini satu-satunya langkah manual yang wajib.
- **Mulai sesi** — dari `CHECKED_IN` ke `ACTIVE`. Berjalan **otomatis** saat jam mulai booking tiba.
- **Selesaikan sesi** — dari `ACTIVE` ke `COMPLETED`. Berjalan **otomatis** pada jam selesai booking.

Lakukan check-in hanya setelah pelanggan tiba dan identitasnya sesuai.

**Aturan otomatis:**

- Sesi baru dimulai setelah pelanggan check-in. Booking yang belum check-in tidak akan berubah menjadi `ACTIVE`.
- Jika pelanggan datang terlambat, jam mulai sesi memakai waktu check-in, tetapi jam selesai tetap sesuai booking. Contoh: booking 19:00–21:00, check-in 19:30 → sesi aktif 19:30 dan tetap selesai 21:00 (efektif 1,5 jam).
- Tombol **Mulai sesi** dan **Selesaikan sesi** tetap tersedia sebagai override manual staff, misalnya untuk menutup sesi lebih awal.
- Setelah jam selesai, check-in dan mulai sesi ditolak server. Jika ada sesi `ACTIVE`/`CHECKED_IN` yang sudah lewat jam selesai, halaman akan menyelesaikannya otomatis pada pemuatan berikutnya; tombol **Selesaikan sesi** juga tersedia sebagai cadangan.
- Halaman admin menyegarkan data setiap 60 detik, jadi perubahan status otomatis terlihat tanpa reload manual.
- No-show (`CONFIRMED` yang tidak pernah check-in) tidak diselesaikan otomatis. Staff memutuskan pembatalan atau penanganan lain sesuai kebijakan lounge.

### Konfirmasi via WhatsApp

Setelah pembayaran diverifikasi (atau saat booking Bayar di Tempat dibuat), staff dapat mengirim konfirmasi ke WhatsApp pelanggan langsung dari detail booking.

1. Buka detail booking.
2. Pada panel **Konfirmasi via WhatsApp**, nomor pelanggan sudah terisi otomatis dari profilnya. Nomor yang diisi saat checkout juga otomatis tersimpan ke profil. Jika kosong atau salah, minta nomor ke pelanggan lalu isi manual.
3. Pilih jenis pesan: **Konfirmasi booking**, **Pengingat pembayaran**, atau **Pembatalan booking**.
4. Periksa teks pesan (boleh diubah) lalu klik **Buka WhatsApp**.
5. Tekan kirim di aplikasi WhatsApp.

Pesan berisi kode booking, setup, jadwal, durasi, total, metode/status pembayaran, alamat lounge, dan tautan detail booking bila `NEXT_PUBLIC_APP_URL` memakai domain publik. Tautan `localhost` otomatis tidak disertakan.

> Fitur ini memakai tautan klik-untuk-chat `wa.me`: aplikasi hanya membuka WhatsApp dengan nomor dan teks yang sudah terisi. **Tidak ada pesan yang dikirim otomatis** dan tidak diperlukan WhatsApp API/kredensial. Kirim dari nomor lounge resmi, dan jangan menganggap pesan terkirim sebelum staff menekan kirim di WhatsApp.

### Pembatalan

- Staff dapat membatalkan booking `PENDING` atau `CONFIRMED`.
- Jika pembayaran sudah `VERIFIED`, status pembayaran menjadi `REFUNDED`.
- Slot langsung dilepas dan bisa dipesan lagi.
- Pelanggan juga dapat membatalkan, tetapi tunduk pada batas jam pembatalan untuk booking `CONFIRMED`.

### Rilis booking kedaluwarsa

Tombol **Rilis kedaluwarsa** menandai semua booking `PENDING` yang melewati `paymentExpiresAt` sebagai `EXPIRED`. Jalankan saat membuka lounge atau setelah periode sibuk agar slot tidak tertahan.

## Mengelola setup (`/admin/setups`)

- **Setup baru** — isi nama, slug, kategori, deskripsi (min. 20 karakter), harga per jam, gambar, galeri, fasilitas, dan spesifikasi.
- **Edit** — perubahan langsung terlihat di katalog publik.
- **Gambar** — pada bagian Media, klik **Unggah gambar** / **Ganti gambar** untuk memilih file dari perangkat. Gambar otomatis diperkecil di browser (maks. 5 MB; JPG, PNG, WebP, AVIF, GIF) lalu disimpan ke database, sehingga tetap ada setelah redeploy. Galeri mendukung unggah beberapa file sekaligus; URL manual juga masih bisa ditempel.
- Setelah mengunggah, klik **Simpan perubahan** agar gambar dipakai oleh setup.
- **Status cepat** — ubah dari daftar tanpa membuka form:
  - `AVAILABLE` — dapat dipesan.
  - `MAINTENANCE` — tidak dapat dipesan; gunakan saat perbaikan.
  - `INACTIVE` — tidak dapat dipesan; gunakan saat station tidak dioperasikan.
- Menonaktifkan setup **tidak** menghapus riwayat booking.
- **Hapus** hanya tersedia untuk setup yang belum pernah memiliki booking. Setup dengan riwayat booking harus dinonaktifkan agar data historis dan pembayaran tetap utuh.
- Slug harus unik dan hanya berisi huruf kecil, angka, dan tanda hubung.
- Harga adalah bilangan bulat rupiah per jam. Harga booking dihitung server dari nilai ini.
- **Kartu hero beranda** — menampilkan hingga 6 setup `AVAILABLE` dan berganti otomatis setiap 5 detik. Urutannya mengikuti `featured` lalu `sortOrder`, jadi tandai setup sebagai featured atau atur urutannya untuk mengubah tampilan. Pengunjung bisa memilih lewat titik navigasi; rotasi berhenti saat kursor/fokus berada di kartu dan dimatikan untuk pengguna `prefers-reduced-motion`.

Jika sebuah setup masih memiliki booking aktif, jangan mengubah harga secara retroaktif; booking yang sudah ada menyimpan `hourlyRate` dan `totalPrice` sendiri.

## Manajemen pengguna (`/admin/users`, khusus admin)

- Cari berdasarkan nama, email, atau telepon; filter berdasarkan role.
- Ubah role lewat dropdown di kolom **Aksi**.
- Akun sendiri ditandai **kamu** dan tidak dapat diubah role-nya.
- Menurunkan admin terakhir akan ditolak.

Praktik yang disarankan:

- Berikan `STAFF` hanya kepada karyawan yang membutuhkan akses operasional.
- Tinjau daftar admin secara berkala.
- Turunkan role segera saat seseorang berhenti.

## Pengaturan lounge (`/admin/settings`, khusus admin)

| Bagian | Dampak |
| --- | --- |
| Identitas | Nama dan tagline di seluruh situs. |
| Zona waktu | Dasar konversi UTC → waktu tampilan dan perhitungan hari. |
| Jam operasional | Batas slot yang dapat dipesan. Waktu tutup harus setelah waktu buka; booking lintas tengah malam tidak didukung. |
| Durasi minimum/maksimum | Batas durasi booking. Minimum tidak boleh melebihi maksimum. |
| Interval slot | Jarak antar pilihan waktu mulai dan kelipatan durasi. |
| Batas pembayaran | Menit sebelum booking `PENDING` kedaluwarsa. |
| Batas pembatalan | Jam sebelum sesi ketika pelanggan masih boleh membatalkan booking `CONFIRMED`. |
| Kontak & lokasi | Ditampilkan di footer dan halaman terkait. |
| Rekening | Instruksi pembayaran untuk pelanggan. |
| Kebijakan pembatalan | Teks kebijakan yang ditampilkan ke pelanggan. |

Perubahan pengaturan berlaku pada request berikutnya. Booking yang sudah ada tidak dihitung ulang.

> Mengubah zona waktu dapat membuat booking lama tampil pada jam lokal yang berbeda. Lakukan hanya jika lounge benar-benar berpindah zona waktu.

## Audit log

Audit log mencatat antara lain:

- `booking.created`, transisi status, dan pembatalan.
- `payment.verified`.
- `setup.created`, `setup.updated`, `setup.status.*`.
- `user.role.updated`.
- `settings.updated`.

Audit log dapat dilihat di detail booking (untuk aktivitas booking) dan ringkasannya di overview. Gunakan untuk investigasi selisih status, verifikasi ganda, atau perubahan pengaturan yang tidak terduga.

## Checklist harian

**Sebelum buka**

- [ ] Cek booking hari ini dan status pembayarannya.
- [ ] Verifikasi pembayaran yang sudah masuk.
- [ ] Kirim konfirmasi WhatsApp untuk booking yang sudah terkonfirmasi.
- [ ] Jalankan **Rilis kedaluwarsa**.
- [ ] Pastikan setup yang dipakai berstatus `AVAILABLE`.

**Selama operasional**

- [ ] Check-in pelanggan saat tiba (sesi lalu berjalan otomatis).
- [ ] Pantau sesi berjalan; sesi selesai otomatis pada jam booking.
- [ ] Tangani pembatalan dan refund sesuai kebijakan.

**Setelah tutup**

- [ ] Pastikan tidak ada sesi `ACTIVE`/`CHECKED_IN` yang tertinggal.
- [ ] Catat pembayaran tunai/QRIS yang perlu diverifikasi.
- [ ] Periksa setup yang perlu masuk `MAINTENANCE`.

## Eskalasi

- **Tidak bisa login** — pastikan role akun masih aktif dan password benar. Admin lain dapat memeriksa role di `/admin/users`.
- **Slot bentrok** — sistem menolak overlap secara sengaja. Periksa booking aktif pada setup tersebut; gunakan halaman ketersediaan.
- **Pembayaran tidak bisa diverifikasi** — periksa metode pembayaran, status pembayaran (`VERIFIED`/`REFUNDED` tidak bisa diverifikasi ulang), status booking, dan nominal. Untuk Bayar di Tempat, verifikasi diizinkan sampai status `COMPLETED` (termasuk sesi yang selesai otomatis).
- **Data tidak sesuai** — periksa audit log dan zona waktu pengaturan sebelum melakukan perubahan manual.
