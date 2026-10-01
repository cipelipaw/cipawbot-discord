import fs from 'fs';
import { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';

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
    GatewayIntentBits.GuildMessages,
  ]
});

client.on('clientReady', async () => {
  console.log(`Bot online sebagai: ${client.user.tag}`);
  const guild = await client.guilds.fetch(env.GUILD_ID);

  const announceChannel = guild.channels.cache.find(
    c => c.name.includes('announcements')
  );

  if (!announceChannel) {
    console.error('Channel announcement tidak ditemukan!');
    process.exit(1);
  }

  const embed = new EmbedBuilder()
    .setTitle('📢 INFORMASI UNTUK PLAYER SURVIVE THE APOCALYPSE')
    .setDescription(
      `Khusus untuk member **Social High Five** yang bermain **Survive the Apocalypse**, diwajibkan untuk mengambil **role Survive the Apocalypse** yang telah disediakan.\n\n` +
      `Role ini akan digunakan untuk menyampaikan berbagai informasi penting terkait game, seperti:\n\n` +
      `🎮 **Info & Update Gameplay**\n` +
      `📅 **Rencana Bermain / Long Run**\n` +
      `🤝 **Koordinasi & Ajakan Mabar**\n` +
      `📢 **Event atau kegiatan khusus**\n` +
      `⚠️ **Informasi penting lainnya terkait Survive the Apocalypse**\n\n` +
      `**Pastikan kalian sudah mengambil role tersebut** agar tidak ketinggalan informasi dan rencana bermain bersama member lainnya.\n\n` +
      `👉 *Kalian bisa langsung klik tombol di bawah ini atau ke channel <#${config.AMBIL_ROLE_CHANNEL_ID}>.*\n\n` +
      `Terima kasih dan **selamat bermain!** 🧟‍♂️🔥\n` +
      `**— Social High Five**`
    )
    .setColor('#2ECC71')
    .setFooter({ text: 'Social High Five • Announcement' })
    .setTimestamp();

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('role_sta')
      .setLabel('Ambil Role STA')
      .setEmoji('🧟')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setLabel('Channel Ambil Role')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${guild.id}/${config.AMBIL_ROLE_CHANNEL_ID}`)
  );

  const sentMessage = await announceChannel.send({
    content: '@everyone',
    embeds: [embed],
    components: [buttonRow],
  });

  console.log(`Pengumuman berhasil dikirim ke #${announceChannel.name} (Message ID: ${sentMessage.id})!`);

  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
