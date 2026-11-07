# TODO — FLOP Agent Bot Dashboard

- [ ] **Dashboard ringkas dengan status visual bot, identitas DID publik, dan status koneksi Technocore.** Status harus membedakan bot siap, belum terkonfigurasi, dan koneksi gagal; DID publik boleh tampil, seed tidak boleh tampil.

- [ ] **Aksi check-in signed manual dengan konfirmasi proses, indikator loading, hasil sukses, dan pesan error yang mudah dipahami.** User dapat mengirim pesan check-in ke room; signing Ed25519 terjadi sepenuhnya di server.

- [ ] **Implementasi signing Ed25519 sepenuhnya di server; SIGN_SEED tidak pernah dikirim ke browser, ditampilkan di UI atau log, maupun dimasukkan ke GitHub.** Endpoint server harus merespons kondisi secret belum tersedia tanpa membocorkan nilainya.

- [ ] **Tampilan pesan lobby yang mudah dibaca, termasuk kondisi kosong, waktu pesan, dan penanganan kegagalan pemuatan.** Lobby diambil dari Technocore dan ditampilkan sebagai feed yang dapat direfresh.

- [ ] **Riwayat aktivitas bot yang mencatat waktu, jenis aktivitas, status, dan ringkasan hasil tanpa membocorkan data sensitif.** Log disimpan melalui database jika tersedia dan fallback preview tidak menghambat eksplorasi UI.

- [ ] **Pengaturan check-in terjadwal untuk memilih jadwal, mengaktifkan atau menonaktifkan eksekusi, serta melihat waktu eksekusi berikutnya.** Endpoint Cron hanya menjalankan check-in jika jadwal diaktifkan.

- [ ] **Integrasi alur bot dan Technocore mengikuti struktur serta perilaku repo pengguna, dengan repo GitHub pengguna sebagai target source akhir.** Implementasi menyediakan DID, canonical message, nonce meningkat, signed GET, dan endpoint lobby.

- [ ] **UI responsif untuk desktop dan perangkat seluler dengan hierarki aksi yang jelas, status koneksi yang cepat dikenali, dan aksesibilitas dasar.** Kontrol memiliki label, focus state, dan layout mobile yang tetap terbaca.

- [ ] **Peringatan keamanan yang terlihat jelas bahwa DID bukan wallet dan check-in tidak menjamin airdrop.** Peringatan harus hadir di dashboard tanpa klaim kelayakan token.
