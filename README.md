# STAF YONPOMAD

Portal dokumen dan informasi satuan, dengan HTML, CSS, JavaScript dan backend TypeScript. Frontend berada di `public/index.html`, `public/style.css`, `public/script.js`. Backend lengkap berada di `app/api/[...path]/route.ts`. Tiga berkas frontend saja tidak menyediakan autentikasi atau penyimpanan server.

## Menggunakan website

1. Buka URL website dan verifikasi akun melalui ChatGPT.
2. Pemilik portal mengisi nama dan kata sandi minimal 12 karakter untuk mengaktifkan admin. Hanya email pemilik yang ditetapkan server melalui ADMIN_EMAIL dapat melakukan langkah ini; tidak ada kata sandi bawaan.
3. Login dengan kata sandi portal. Admin memiliki akses seluruh Staf 1–4.
4. Personel memverifikasi akun ChatGPT sendiri, memilih Daftar Akun, mengisi nama, staf dan kata sandi. Akun baru berstatus Menunggu.
5. Admin membuka Kelola Akun, menetapkan staf, lalu Setujui/Simpan. Nonaktifkan mencabut sesi yang ada.
6. Unggah dokumen maksimal 20 MiB (20 × 1024 × 1024 byte). Personel dapat unggah/unduh hanya pada staf sendiri. Admin dapat mengunggah, mengunduh, dan menghapus semua dokumen.
7. Atur logo resmi melalui URL HTTPS, profil dan struktur organisasi, video YouTube/MP4 serta tautan Instagram, Facebook, TikTok dan YouTube di Pengaturan. Huruf Y dan ikon staf adalah penanda UI generik, bukan logo resmi.
8. Tambahkan konten pada Berita, Publikasi dan Informasi. Konten publik harus sesuai untuk pengunjung umum. Dokumen tidak dipublikasikan di bagian ini.

## Menu
Beranda, Profile, Berita, Video, Publikasi, Informasi, Sosial Media, Staf 1 Intel, Staf 2 Operasional, Staf 3 Personalia, Staf 4 Logistik. Admin mendapat menu Kelola Akun dan Pengaturan.

## Penyimpanan dan autentikasi

- Menggunakan database D1 dan penyimpanan file R2 yang dihubungkan oleh Sites; tidak terhubung ke Google Drive.
- Identitas pengunjung berasal dari login ChatGPT milik platform; kata sandi portal menjadi pemeriksaan tambahan. Pengunjung memerlukan akun ChatGPT.
- ADMIN_EMAIL adalah konfigurasi server untuk pemilik pertama. Jangan menaruh password pada kode frontend.
- Hash kata sandi PBKDF2 SHA-256, salt acak per pengguna, 100.000 iterasi.
- Sesi delapan jam dengan cookie Secure, HttpOnly, SameSite=Strict, token tersimpan sebagai hash dan terikat identitas platform.
- Persetujuan dan staf diperiksa di server pada setiap permintaan dokumen. Nonaktifkan akun mencabut semua sesinya.
- Percobaan login dibatasi 10 per 15 menit untuk tiap identitas. Request mutasi memeriksa Origin.
- Nama file dibersihkan. File diunduh sebagai attachment dengan tipe octet-stream dan nosniff, bukan dieksekusi di browser.
- Penghapusan permanen memerlukan konfirmasi. Pemulihan kata sandi dan backup otomatis belum disediakan.

## Menjalankan / mengembangkan

Diperlukan Node.js >=22.13.0 dan dependensi sesuai package.json/pnpm-lock.yaml. Project ini menggunakan Vinext pada Cloudflare Workers.

```
pnpm install
pnpm run db:generate
pnpm run build
node --test tests/access.test.mjs
pnpm run dev
```

Runtime perlu binding `DB` (D1), `BUCKET` (R2), dan environment `ADMIN_EMAIL`. Migrasi SQL berada di `drizzle/`. Situs terhosting menerapkan migrasi saat deployment. Untuk lingkungan pengembangan lokal, terapkan migrasi pada database lokal menurut konfigurasi runtime sebelum mencoba API. File frontend menggunakan URL `/api/`, sehingga membuka index.html langsung dengan file:// tidak menjalankan backend.

Identitas HTTP `oai-authenticated-user-id` dan `oai-authenticated-user-email` hanya boleh disuplai gateway Sites tepercaya. Jangan menerapkan kode ini pada hosting umum yang membiarkan pengunjung memalsukan header tersebut. Jika dipindahkan ke hosting lain, integrasikan penyedia identitas tepercaya terlebih dahulu. Project ID pada `.openai/hosting.json` adalah identitas deployment ini; untuk project baru, daftarkan Site baru dan ganti identitas melalui alur Sites.

## Pencarian Google

Judul, deskripsi, teks HTML publik, canonical, robots.txt dan sitemap.xml disediakan untuk STAF YONPOMAD. Halaman informasi dapat dibuka publik; dokumen dilindungi pemeriksaan server. Indeks/ranking Google tidak bisa dijamin dan mungkin membutuhkan waktu. Setelah situs dapat diakses publik, pemilik dapat mendaftarkan URL/sitemap melalui Google Search Console. Ganti canonical dan sitemap jika domain berubah. Jangan menganggap robots.txt sebagai mekanisme keamanan.

## Verifikasi

- Pemeriksaan sintaks JavaScript dan TypeScript.
- Pengujian backend dengan database SQLite sementara dan penyimpanan objek pengganti: admin pertama hanya pemilik, login dan sesi, akun menunggu, persetujuan, pembatasan lintas staf, batas 20 MiB, larangan hapus untuk personel, pencabutan akses, hapus oleh admin, dan logout.
- Build produksi dijalankan sebelum publikasi.
- Pemeriksaan visual melalui browser belum tersedia dalam sesi pembuatan ini. Tata letak responsif memakai breakpoint desktop, tablet, dan HP.

## Kode unduhan

Arsip ZIP berisi sumber aplikasi, frontend lengkap, migrasi, tes dan panduan ini. Folder node_modules, data runtime lokal, file build dan kredensial tidak disertakan.
