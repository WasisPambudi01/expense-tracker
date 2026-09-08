# Buku Kas — Pencatatan Pengeluaran & Anggaran Pribadi

Aplikasi web pencatatan pengeluaran, pemasukan, dan anggaran bulanan. Data disimpan di **Supabase** (database gratis di cloud) dan diamankan dengan login email + password, sehingga catatanmu **otomatis sinkron** antara laptop dan HP. Pendaftaran publik dimatikan — hanya kamu yang bisa punya akun, dan akunnya dibuat manual lewat dashboard Supabase (bukan lewat form pendaftaran di web).

## Langkah 1 — Buat project Supabase (gratis)

1. Buka [supabase.com](https://supabase.com) → **Start your project** → daftar/login (bisa pakai akun GitHub).
2. Klik **New Project**. Isi nama bebas (mis. `buku-kas`), buat password database (simpan, tapi tidak akan dipakai lagi di app ini), pilih region terdekat (mis. Singapore), lalu **Create new project**. Tunggu ~1–2 menit sampai project siap.
3. Di sidebar project, buka **SQL Editor** → **New query**. Buka file `supabase-setup.sql` dari folder ini, salin isinya, tempel di editor, lalu klik **Run**. Ini akan membuat tabel penyimpanan data beserta aturan keamanannya (setiap orang hanya bisa melihat/mengubah datanya sendiri).
4. Buka **Project Settings → API**. Catat dua nilai ini:
   - **Project URL** → contoh `https://xxxxx.supabase.co`
   - **anon public key** → deretan huruf/angka panjang

## Langkah 2 — Buat akunmu & tutup pendaftaran publik

1. Di Supabase, buka **Authentication → Sign In / Providers** (atau **Settings** di bagian Authentication), cari opsi **"Allow new users to sign up"**, lalu **matikan**. Ini mencegah siapa pun membuat akun baru lewat aplikasi.
2. Buka **Authentication → Users → Add user → Create new user**. Isi dengan email dan password kamu sendiri, centang **"Auto Confirm User"** kalau tersedia, lalu simpan. Inilah satu-satunya akun yang bisa dipakai untuk masuk ke aplikasi.

## Langkah 3 — Coba jalan di komputer sendiri (opsional)

```bash
npm install
cp .env.example .env
```

Buka file `.env`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dengan nilai dari Langkah 1. Lalu:

```bash
npm run dev
```

Buka `http://localhost:5173`, masuk dengan email + password akun yang sudah kamu buat di Langkah 2.

## Deploy ke Internet (gratis)

Cara termudah: **Vercel**, lewat GitHub.

### Langkah 1 — Unggah ke GitHub
1. Buat akun di [github.com](https://github.com) kalau belum punya.
2. Buat repository baru (mis. `buku-kas`), lalu unggah semua isi folder ini. Cara termudah: masuk ke halaman repo baru itu, klik "uploading an existing file", lalu seret semua file/folder dari sini (kecuali folder `node_modules` dan `dist` jika ada).

### Langkah 2 — Deploy di Vercel
1. Buat akun di [vercel.com](https://vercel.com) — bisa langsung "Continue with GitHub".
2. Klik **Add New → Project**, pilih repo `buku-kas` yang tadi diunggah.
3. Sebelum klik Deploy, buka bagian **Environment Variables**, tambahkan dua baris:
   - `VITE_SUPABASE_URL` → isi dengan Project URL dari Supabase
   - `VITE_SUPABASE_ANON_KEY` → isi dengan anon public key dari Supabase
4. Biarkan pengaturan build default (Vercel otomatis mengenali project Vite). Klik **Deploy**.
5. Setelah selesai (~1 menit), kamu dapat URL seperti `buku-kas.vercel.app`. Buka, lalu masuk dengan akun yang sudah kamu buat di Langkah 2.

Setiap kali kamu (atau saya) mengubah kode dan mengunggah ulang ke GitHub, Vercel otomatis mem-build ulang dan memperbarui situsnya.

### Alternatif — Netlify (drag & drop, tanpa GitHub)
1. Isi `.env` lokal seperti Langkah 3 di atas, jalankan `npm install` lalu `npm run build` — hasilnya folder `dist`.
2. Buka [app.netlify.com/drop](https://app.netlify.com/drop), seret folder `dist` ke halaman itu untuk deploy pertama.
3. Untuk update berikutnya, lebih baik hubungkan repo GitHub-nya lewat Netlify agar env variable & build otomatis tertangani (drag-and-drop manual tidak menyertakan env variable dengan mudah).

## Penting soal data & keamanan
- Data tersimpan di database Supabase, dibatasi lewat **Row Level Security** — hanya kamu (setelah login) yang bisa membaca/mengubah datamu sendiri.
- Login memakai **email + password**; sesi login tersimpan otomatis di browser, jadi tidak perlu login ulang setiap buka aplikasi.
- **Pendaftaran publik dimatikan** — tidak ada tombol/form daftar di aplikasi maupun lewat API. Akun hanya bisa ditambahkan manual lewat dashboard Supabase (Authentication → Users).
- Karena disimpan di cloud, data otomatis sama antara laptop dan HP — cukup login pakai akun yang sama di kedua perangkat.
- Paket gratis Supabase cukup untuk pemakaian pribadi (database 500MB, sampai 50.000 pengguna aktif/bulan) — jauh lebih dari cukup untuk satu orang.
- `anon public key` aman untuk ditaruh di kode frontend (memang dirancang untuk itu) — keamanan sebenarnya ada di aturan Row Level Security yang sudah dibuat lewat `supabase-setup.sql`.
