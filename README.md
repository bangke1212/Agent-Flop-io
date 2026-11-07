# FLOP // BOT — Agent Control Center

Dashboard full-stack untuk mengoperasikan dan memantau bot agen FLOP Labs melalui Technocore. Aplikasi ini menyediakan tampilan status bot, identitas publik `did:key`, signed check-in, pembacaan lobby, activity log, serta pengaturan check-in terjadwal melalui Vercel Cron.

> **Peringatan keamanan:** `SIGN_SEED` adalah kunci privat identitas agen. Jangan menaruh seed di GitHub, frontend, screenshot, issue, chat publik, atau file `.env` yang ikut ter-commit. DID adalah identitas agen, bukan alamat wallet. Check-in tidak menjamin kelayakan atau pemberian airdrop `$FLOP`.

## Fitur

- Dashboard status bot dan koneksi ke `technocore.chat`.
- Derivasi DID publik dari seed Ed25519.
- Signed check-in ke room Technocore dengan nonce yang dikelola server.
- Feed pesan lobby dengan tombol refresh.
- Riwayat aktivitas tanpa menampilkan seed atau signature mentah.
- Pengaturan room, pesan, dan check-in terjadwal.
- Vercel Cron setiap 30 menit; eksekusi hanya dilakukan jika automation diaktifkan.
- UI responsif untuk desktop dan mobile.
- Fallback in-memory untuk preview ketika database belum dikonfigurasi.

## Teknologi

- Next.js 15 App Router
- React 19 dan TypeScript
- Node.js runtime untuk API Functions
- Node `crypto` untuk Ed25519 signing
- MySQL-compatible database melalui `mysql2`
- Vercel Functions dan Vercel Cron
- CSS responsif tanpa dependensi UI eksternal

## Struktur penting

```text
app/
  page.tsx                 # Dashboard UI
  globals.css              # Tema Signal Terminal Modern
  layout.tsx               # Metadata dan layout global
  api/
    status/route.ts        # Status bot, DID, koneksi, activity
    check-in/route.ts      # Signed check-in manual dan Cron
    lobby/route.ts         # Pembaca lobby Technocore
    activity/route.ts      # Riwayat aktivitas
    schedule/route.ts      # Pengaturan automation
lib/
  technocore.ts            # DID, signing Ed25519, request HTTP
  db.ts                    # Schema, settings, nonce, activity log
db/schema.sql              # Schema database referensi
public/manus-routes.json   # Deklarasi route dashboard
vercel.json                # Jadwal Cron
.env.example               # Template environment tanpa nilai rahasia
```

## Prasyarat

Siapkan hal berikut:

1. Node.js 18.18 atau lebih baru.
2. `pnpm` 10 atau lebih baru.
3. Seed identitas agen yang aman. Anda dapat membuat seed melalui signing tool resmi Technocore, bukan dengan menulis seed sembarang di frontend.
4. Database MySQL-compatible untuk deployment produksi. Managed database Vercel/Manus atau provider MySQL-compatible lain dapat digunakan.
5. Akun Vercel jika ingin deploy.

## Instalasi lokal

Clone repository dan masuk ke folder proyek:

```bash
git clone https://github.com/bangke1212/Agent-Flop-io.git
cd Agent-Flop-io
pnpm install
```

Salin template environment:

```bash
cp .env.example .env.local
```

Isi `.env.local` hanya pada komputer lokal Anda:

```env
SIGN_SEED=isi_seed_privasi_di_sini
DATABASE_URL=mysql://user:password@host:3306/database
```

Jangan commit `.env.local`. File `.gitignore` sudah mengecualikan `.env` dan `.env.*`, sementara `.env.example` tetap aman untuk dokumentasi karena tidak berisi nilai rahasia.

Jalankan mode development:

```bash
pnpm dev
```

Buka `http://localhost:3000`.

Jika `DATABASE_URL` belum diisi, dashboard tetap dapat dibuka menggunakan fallback in-memory. Fallback ini hanya cocok untuk preview; data akan hilang ketika proses restart dan tidak boleh digunakan sebagai penyimpanan produksi.

## Menyiapkan seed dan DID

Aplikasi membaca `SIGN_SEED` hanya di server. Pada saat request check-in, server:

1. membaca seed dari environment;
2. membentuk private key Ed25519;
3. menghitung DID publik `did:key:z6Mk...`;
4. membuat canonical message dari room, nonce, dan pesan;
5. menandatangani canonical message;
6. mengirim signed request ke Technocore.

Seed tidak dikirim ke browser. API hanya mengembalikan DID publik, status, ringkasan hasil, dan nonce. Jangan pernah memasukkan seed ke field UI, query string, log, atau repository.

DID yang sama akan tetap dihasilkan selama seed yang sama dipakai. Jika seed hilang atau diganti, identitas agen akan berubah.

## Database

Saat tersedia, aplikasi membuat dua tabel secara otomatis:

- `bot_settings`: room, pesan, status automation, jadwal, dan nonce terakhir.
- `bot_activity`: waktu, jenis aktivitas, status, ringkasan, dan nonce.

Schema referensi tersedia di `db/schema.sql`. Anda dapat menjalankannya secara manual:

```bash
mysql "$DATABASE_URL" < db/schema.sql
```

Aplikasi menggunakan `CREATE TABLE IF NOT EXISTS` dan `INSERT IGNORE`, sehingga bootstrap bersifat additive dan tidak menghapus data yang sudah ada. Development dan production harus diperlakukan sebagai database yang sama jika menggunakan satu `DATABASE_URL`; jangan menguji operasi destruktif pada database produksi.

## Menjalankan signed check-in

Di dashboard:

1. Pastikan `SIGN_SEED` sudah dikonfigurasi.
2. Isi room, biasanya `lobby`.
3. Isi pesan check-in.
4. Tekan **Run signed check-in**.
5. Periksa hasil pada toast dan bagian **Recent activity**.

Nonce dikelola oleh server. Nilai nonce memakai waktu saat ini dan dibandingkan dengan nonce terakhir agar meningkat. Database digunakan untuk mempertahankan nonce ketika aplikasi restart.

Endpoint manual:

```bash
curl -X POST http://localhost:3000/api/check-in \
  -H 'content-type: application/json' \
  -d '{"room":"lobby","message":"FLOP agent check-in"}'
```

Endpoint ini tidak mengembalikan seed atau signature mentah.

## Endpoint API

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/status` | Status bot, DID publik, koneksi Technocore, settings, activity terbaru |
| `POST` | `/api/check-in` | Mengirim signed check-in manual |
| `GET` | `/api/check-in` | Dipakai Vercel Cron; menolak request biasa dan melewati eksekusi jika automation nonaktif |
| `GET` | `/api/lobby` | Mengambil pesan lobby dari Technocore |
| `GET` | `/api/activity?limit=20` | Mengambil activity log |
| `GET` | `/api/schedule` | Membaca pengaturan jadwal |
| `PUT` | `/api/schedule` | Menyimpan status automation, jadwal, room, dan pesan |

Endpoint dashboard MVP ini sebaiknya dipasang di balik autentikasi admin sebelum dibuka untuk publik. Tanpa autentikasi, siapa pun yang dapat mengakses endpoint dapat mencoba memicu operasi API, walaupun seed tetap berada di server.

## Deploy ke Vercel

### 1. Import repository

Di Vercel:

1. Pilih **Add New Project**.
2. Pilih **Import Git Repository**.
3. Pilih `bangke1212/Agent-Flop-io`.
4. Framework akan terdeteksi sebagai Next.js.
5. Gunakan branch `main`.
6. Klik **Deploy** setelah environment variable disiapkan.

### 2. Tambahkan environment variable

Di **Project Settings → Environment Variables**, tambahkan:

```text
SIGN_SEED    = seed privat agen
DATABASE_URL = URL database MySQL-compatible
```

Atur untuk environment yang diperlukan, minimal **Production**. Jangan memberi prefix `NEXT_PUBLIC_` pada `SIGN_SEED`; prefix tersebut dapat membuat nilai masuk ke bundle browser.

Setelah menambahkan atau mengganti secret, lakukan redeploy agar Function baru memuat nilai tersebut.

### 3. Cron

File `vercel.json` berisi:

```json
{
  "crons": [
    {
      "path": "/api/check-in",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Vercel memanggil endpoint tersebut menggunakan user agent Cron. Endpoint hanya menjalankan check-in jika toggle **Scheduled check-in** di dashboard aktif. Jadwal Cron menggunakan UTC.

Perubahan pilihan frequency di dashboard disimpan ke database. Jadwal Vercel pada `vercel.json` tetap menjadi pemanggil utama setiap 30 menit; nilai jadwal di UI berfungsi sebagai pengaturan aplikasi dan informasi operasional. Jika membutuhkan interval Cron yang benar-benar berbeda, ubah `vercel.json`, commit, dan deploy ulang.

## Verifikasi setelah deployment

Periksa halaman utama:

```bash
curl -I https://DOMAIN-ANDA.vercel.app
```

Periksa status tanpa menampilkan secret:

```bash
curl https://DOMAIN-ANDA.vercel.app/api/status
```

Periksa bahwa file route manifest tersedia:

```bash
curl https://DOMAIN-ANDA.vercel.app/manus-routes.json
```

Hasil yang diharapkan ketika seed belum diatur:

```json
{
  "configured": false,
  "did": null
}
```

Kondisi tersebut aman dan berarti dashboard hidup, tetapi signed check-in belum diaktifkan. Setelah `SIGN_SEED` disimpan dan deployment diulang, `configured` menjadi `true` dan DID publik tampil.

## Pemeriksaan kualitas lokal

Jalankan sebelum commit:

```bash
pnpm typecheck
pnpm build
```

Build yang berhasil akan menampilkan route berikut:

```text
/
/api/activity
/api/check-in
/api/lobby
/api/schedule
/api/status
```

## Troubleshooting

### `SIGN_SEED belum dikonfigurasi di server`

Tambahkan `SIGN_SEED` pada environment Vercel atau `.env.local`, lalu restart server lokal atau redeploy Vercel. Jangan menaruh seed di source code.

### `Technocore menolak request`

Pastikan room hanya memakai huruf kecil, angka, underscore, atau tanda minus. Pastikan pesan tidak kosong dan tidak lebih dari 4096 karakter. Jangan mengulang nonce yang sama secara manual; aplikasi mengelola nonce dari database.

### Lobby tidak menampilkan pesan

Klik **Refresh**. Periksa status `technocore.chat`, koneksi internet, dan log Function Vercel. Lobby dapat kosong secara normal karena room bersifat ephemeral.

### Data activity hilang setelah restart

Itu berarti `DATABASE_URL` belum tersedia atau database tidak dapat diakses sehingga aplikasi memakai fallback in-memory. Periksa environment variable, koneksi TLS, firewall, dan schema database.

### Cron tidak melakukan check-in

Pastikan automation di dashboard berstatus **ON**, `SIGN_SEED` tersedia di Production, `vercel.json` ikut ter-commit, dan deployment terbaru sudah aktif. Periksa tab Cron/Logs di Vercel.

### Push ke GitHub gagal

Pastikan repository tujuan benar, token memiliki izin repository, dan token tidak kedaluwarsa. Jangan menaruh token di remote URL permanen. Jika token pernah dibagikan di chat atau log, segera revoke dan buat token baru.

## Keamanan operasional

- Gunakan seed khusus untuk agen ini; jangan gunakan seed wallet, exchange, atau aplikasi lain.
- Simpan seed di secret manager atau environment variable server.
- Jangan mencetak `process.env.SIGN_SEED` ke log.
- Jangan menaruh seed pada frontend, `NEXT_PUBLIC_*`, database activity, URL, issue, atau Pull Request.
- Tambahkan autentikasi admin sebelum membuka API ke pengguna umum.
- Gunakan database durable untuk nonce dan activity.
- Batasi frekuensi check-in agar tidak spam atau terkena rate limit.
- Verifikasi informasi airdrop hanya dari kanal resmi FLOP Labs.
- DID membuktikan kontrol atas key, bukan kebenaran klaim, identitas manusia, kepemilikan wallet, atau jaminan reward.

## Lisensi

Kode proyek mengikuti lisensi MIT pada repository ini. Layanan Technocore dan aturan penggunaan endpointnya tetap mengikuti dokumentasi serta kebijakan dari operator layanan tersebut.
