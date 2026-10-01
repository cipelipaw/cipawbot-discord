# Social High Five Discord Bot 🤖

Bot resmi server Discord **Social High Five**.

## Fitur Utama
1. **Verifikasi Member Otomatis (`#rules`)**
2. **Pengambilan Role Interaktif (`#ambil-role`):**
   - Role Game: *Survive The Apocalypse*, *Roblox*, *Mobile Legends*
   - Role Gender: *King* (Biru), *Queen* (Pink)
3. **Papan Pengumuman Khusus STA (`#pengumuman-sta`)**
4. **Sistem Party Mabar Otomatis 5 Slot (`/mabar` & `!mabar`):**
   - Auto-list player di embed
   - Tombol `[ 🎮 Ikutan Mabar ]` & `[ ❌ Batal Ikut ]`
   - Kunci otomatis saat penuh (5/5) & mention ke voice channel `STA Squad`
5. **Welcome & Goodbye Banner**

## Cara Menjalankan di Rumah:
1. Clone repositori:
   ```bash
   git clone https://github.com/cipelipaw/edit-discord.git
   cd edit-discord
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Buat file `.env` dan masukkan token bot:
   ```env
   BOT_TOKEN=...
   GUILD_ID=...
   ```
4. Jalankan bot:
   ```bash
   node bot.mjs
   ```
