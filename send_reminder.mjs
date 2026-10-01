import fs from 'fs';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=').trim();
}

const config = JSON.parse(fs.readFileSync('server_config.json', 'utf-8'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ]
});

client.on('clientReady', async () => {
  console.log(`Bot Cipaw online sebagai: ${client.user.tag}`);
  const guild = await client.guilds.fetch(env.GUILD_ID);
  const members = await guild.members.fetch();

  // Ambil member yang belum punya role Member
  const unverifiedMembers = [];
  for (const [id, m] of members) {
    if (m.user.bot) continue;
    const hasMemberRole = m.roles.cache.some(r => r.name.includes('Member'));
    const isFounder = m.roles.cache.some(r => r.name.includes('Founder'));
    if (!hasMemberRole && !isFounder) {
      unverifiedMembers.push(m);
    }
  }

  console.log(`Ditemukan ${unverifiedMembers.length} member yang belum verifikasi:`);
  unverifiedMembers.forEach(m => console.log(`- ${m.user.username} (${m.id})`));

  if (unverifiedMembers.length === 0) {
    console.log('Semua member sudah terverifikasi!');
    client.destroy();
    process.exit(0);
  }

  // 1. Kirim Pesan Mention di channel #rules
  const channelRules = await guild.channels.fetch(config.RULES_CHANNEL_ID);
  if (channelRules) {
    const mentionsText = unverifiedMembers.map(m => `<@${m.id}>`).join(' ');
    
    const reminderEmbed = new EmbedBuilder()
      .setTitle('📢 PENGUMUMAN PENTING: UPDATE SERVER!')
      .setDescription(
        `Halo guys! Server **${guild.name}** baru saja di-update dan dirapikan!\n\n` +
        `👉 **Cara membuka semua channel:**\n` +
        `Cukup klik tombol **\`✅ Verifikasi Member\`** pada pesan peraturan di atas.\n\n` +
        `Setelah itu, kalian bisa langsung ke channel <#${config.AMBIL_ROLE_CHANNEL_ID}> untuk mengambil role Game (**Roblox**, **Mobile Legends**, **Survive The Apocalypse**) dan Gender (**King** / **Queen**)!\n\n` +
        `*Jangan sampai ketinggalan seru-seruan dan mabar bareng yaa!* 🔥`
      )
      .setColor('#00fff7')
      .setTimestamp();

    await channelRules.send({
      content: `🔔 **Panggilan untuk:** ${mentionsText}\n"Guys, servernya baru di-update! Buka channel <#${config.RULES_CHANNEL_ID}> terus klik tombol **Verifikasi Member** ya biar kebuka semua channelnya!"`,
      embeds: [reminderEmbed]
    });
    console.log('Pesan reminder dan mention berhasil dikirim ke #rules!');
  }

  // 2. Coba kirim DM ke masing-masing member
  for (const m of unverifiedMembers) {
    try {
      await m.send(
        `Hai **${m.user.username}**! 👋\n` +
        `Server **${guild.name}** baru saja di-update nih!\n` +
        `Buka channel <#${config.RULES_CHANNEL_ID}> lalu klik tombol **\`✅ Verifikasi Member\`** ya biar kebuka semua channel obrolan & mabarnya! ✨`
      );
      console.log(`DM terkirim ke: ${m.user.username}`);
    } catch (err) {
      console.log(`Gagal kirim DM ke ${m.user.username} (DM ditutup/private): ${err.message}`);
    }
  }

  console.log('Semua pengingat telah selesai dikirim!');
  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
