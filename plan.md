# Plan — FLOP Agent Bot Dashboard

## Tujuan
Membangun dashboard full-stack yang mudah dipahami untuk mengoperasikan bot agen FLOP Labs berbasis alur Technocore dari repo pengguna. Dashboard menampilkan identitas DID, status koneksi, tombol check-in signed, lobby, riwayat aktivitas, dan pengaturan check-in terjadwal.

## Pendekatan implementasi
- Next.js App Router + TypeScript untuk UI dan server route yang kompatibel dengan Vercel.
- Node.js `crypto` untuk Ed25519 signing. Seed hanya dibaca dari `SIGN_SEED` di server runtime; tidak ada input seed di browser.
- MySQL-compatible managed database melalui `DATABASE_URL` untuk activity log, pengaturan jadwal, dan nonce. Preview memakai fallback in-memory agar UI tetap bisa dieksplorasi sebelum secret/database aktif.
- Route API: `/api/status`, `/api/check-in`, `/api/lobby`, `/api/activity`, `/api/schedule`.
- Vercel Cron memanggil `/api/check-in` melalui GET berkala; endpoint hanya mengeksekusi jika jadwal diaktifkan.
- Request remote memakai HTTPS ke Technocore. Signature dan ringkasan log tidak pernah mengandung seed atau signature mentah.

## Struktur proyek
- `app/page.tsx`: dashboard client dengan kartu status, identitas, check-in, lobby, jadwal, keamanan, dan activity feed.
- `app/globals.css`: sistem visual Signal Terminal Modern, responsif untuk mobile.
- `app/api/*`: server routes untuk status, check-in, lobby, activity, dan jadwal.
- `lib/technocore.ts`: derivasi DID Ed25519, canonical message, signature, dan request ke Technocore.
- `lib/db.ts`: koneksi database, schema bootstrap, persistence settings/activity, dan fallback preview.
- `db/schema.sql`: schema referensi yang dapat dijalankan ulang.
- `public/manus-routes.json`: deklarasi route UI untuk preview tooling.
- `vercel.json`: konfigurasi Cron check-in kompatibel Vercel.

## Desain

### Alternatif gaya
- Mission Control Ramah (0.07): panel terstruktur dengan warna biru-hijau yang menenangkan.
- **Signal Terminal Modern (0.06, dipilih):** estetika terminal gelap dengan aksen hijau elektrik dan tipografi bersih.
- Ledger Editorial (0.05): dashboard terang dengan aksen peringatan hangat.

### Design Movement
Signal Terminal Modern — mengambil ketegasan terminal operasional dan memolesnya menjadi dashboard yang terbaca pengguna non-teknis.

### Core Principles
1. Status penting terlihat dalam hitungan detik.
2. Aksi utama selalu jelas dan aman.
3. Informasi teknis dijelaskan dengan bahasa manusia.
4. Data sensitif tidak pernah muncul di layar.

### Color Philosophy
Latar navy hampir hitam membuat panel dan status mudah dipindai. Hijau elektrik menjadi sinyal hidup/berhasil yang khas, amber memberi peringatan tanpa alarmisme, dan merah hanya untuk kegagalan nyata.

### Layout Paradigm
Dashboard memakai rail navigasi tipis dan bidang kerja asimetris: identitas dan aksi menjadi pusat, sedangkan schedule, keamanan, dan aktivitas menjadi lapisan pendukung.

### Signature Elements
- Garis scanline/grid halus di latar.
- Label status monospaced dengan titik indikator.
- Garis aksen hijau sebagai penanda fokus dan health.

### Interaction Philosophy
Klik utama memberi feedback langsung melalui loading state dan toast. Kartu tidak menyembunyikan kondisi konfigurasi; jika `SIGN_SEED` belum tersedia, UI menjelaskan tindakan yang diperlukan tanpa menampilkan secret.

### Animation
Gunakan transisi 160–220ms, pulse halus hanya untuk indikator live, dan hindari gerakan dekoratif saat operasi sedang berjalan. Loading check-in memakai shimmer ringkas agar status proses jelas.

### Typography System
IBM Plex Sans untuk teks antarmuka dan IBM Plex Mono untuk DID, nonce, label status, dan data teknis. Hierarki memakai heading tebal namun ringkas, body 14–16px, dan label 11–12px uppercase berjarak.

### Brand Essence
Panel kendali yang membuat identitas agen dan check-in Technocore mudah dipahami — jelas, aman, operasional.

### Brand Voice
Singkat, tenang, dan langsung. Contoh: “Agen siap mengirim check-in.” dan “Seed belum terhubung — tambahkan secret di environment server.”

### Wordmark & Logo
Wordmark `FLOP // BOT` dengan slash ganda sebagai simbol jalur pesan dan titik hijau sebagai sinyal agen aktif.

### Signature Brand Color
`#7CFF6B` — hijau elektrik yang menandai sinyal agen, keberhasilan, dan koneksi hidup.

## Batasan material
- Tanpa seed default, tanpa seed di source control, dan tanpa seed di response API.
- DID ditampilkan karena bersifat publik; seed dan signature mentah tidak ditampilkan.
- Check-in bukan klaim airdrop dan DID bukan wallet; peringatan ini selalu terlihat.
- Database managed dipakai bersama development/publikasi; schema additive dan non-destructive.
