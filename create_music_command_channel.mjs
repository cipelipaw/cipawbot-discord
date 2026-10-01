import fs from 'fs';
import { 
  Client, 
  GatewayIntentBits, 
  ChannelType, 
  PermissionsBitField, 
  EmbedBuilder 
} from 'discord.js';

const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=').trim();
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('clientReady', async () => {
  const guild = await client.guilds.fetch(env.GUILD_ID);

  const everyoneRole = guild.roles.everyone;
  const memberRole = guild.roles.cache.find(r => r.name.includes('Member'));

  // Cari kategori Voice Channels atau Community
  let catVoice = guild.channels.cache.find(c => c.name.includes('VOICE CHANNELS') && c.type === ChannelType.GuildCategory);

  // Buat channel teks khusus musik: 🎵︱request-lagu
  console.log('Membuat channel 🎵︱request-lagu...');
  const chMusicCmd = await guild.channels.create({
    name: '🎵︱request-lagu',
    type: ChannelType.GuildText,
    parent: catVoice ? catVoice.id : null,
    topic: 'Ketik command bot musik /play di sini untuk memutar lagu di voice channel!',
    permissionOverwrites: [
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: memberRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.EmbedLinks,
        ],
      },
    ],
  });

  // Kirim panduan cara memutar musik di channel tersebut
  const guideEmbed = new EmbedBuilder()
    .setTitle('🎵 PANDUAN REQUEST LAGU (JOCKIE MUSIC)')
    .setDescription(
      'Channel ini khusus untuk memanggil dan mengontrol bot musik agar tidak mengotori channel obrolan lain!\n\n' +
      '### 🎧 Cara Memutar Lagu:\n' +
      '1. **Join Voice Channel** terlebih dahulu (misal: `🎵︱Music Room`).\n' +
      '2. Ketik perintah di channel ini:\n' +
      '   ```\n' +
      '   /play <judul lagu atau link>\n' +
      '   ```\n' +
      '   *Contoh: `/play mendung tanpo udan` atau `/play lofi hip hop`*\n' +
      '3. **Kontrol Pemutar Lagu:**\n' +
      '   Gunakan tombol interaktif di bawah player (`⏸️ Pause`, `▶️ Play`, `⏭️ Skip`, `⏹️ Stop`).\n\n' +
      '### 📌 Perintah Populer Lainnya:\n' +
      '• `/skip` $\\rightarrow$ Lewati ke lagu berikutnya\n' +
      '• `/queue` $\\rightarrow$ Lihat daftar antrean lagu\n' +
      '• `/stop` $\\rightarrow$ Hentikan musik & keluarkan bot dari voice\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '🔗 **Belum ada bot-nya di server?**\n' +
      '[Klik di sini untuk mengundang Jockie Music](https://discord.com/oauth2/authorize?client_id=411916947773587456&scope=bot&permissions=3148800)'
    )
    .setColor('#5865F2')
    .setFooter({ text: 'Selamat mendengarkan musik santai bareng teman-teman!' })
    .setTimestamp();

  await chMusicCmd.send({ embeds: [guideEmbed] });

  console.log('Channel 🎵︱request-lagu berhasil dibuat dengan panduan!');
  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
