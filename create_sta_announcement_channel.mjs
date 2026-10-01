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
  console.log(`Bot login sebagai: ${client.user.tag}`);
  const guild = await client.guilds.fetch(env.GUILD_ID);

  const everyoneRole = guild.roles.everyone;
  const memberRole = guild.roles.cache.find(r => r.name.includes('Member'));
  const staRole = guild.roles.cache.find(r => r.name.includes('Survive The Apocalypse'));
  const founderRole = guild.roles.cache.find(r => r.name.includes('Founder'));
  const adminRole = guild.roles.cache.find(r => r.name.includes('Admin'));
  const modRole = guild.roles.cache.find(r => r.name.includes('Moderator'));

  if (!staRole) {
    console.error('Role Survive The Apocalypse tidak ditemukan!');
    process.exit(1);
  }

  // Cari kategori GAMING ZONE
  const catGaming = guild.channels.cache.find(
    c => c.name.includes('GAMING ZONE') && c.type === ChannelType.GuildCategory
  );

  const channelName = '📢︱pengumuman-sta';

  // Periksa apakah channel sudah ada
  let existingChannel = guild.channels.cache.find(c => c.name === channelName);
  if (existingChannel) {
    console.log(`Channel ${channelName} sudah ada (ID: ${existingChannel.id}).`);
  } else {
    console.log(`Membuat channel ${channelName}...`);

    const permissionOverwrites = [
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
    ];

    if (memberRole) {
      permissionOverwrites.push({
        id: memberRole.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      });
    }

    // Role STA: Bisa lihat, baca riwayat, tambah reaksi, tapi TIDAK bisa ketik (hanya untuk pengumuman)
    permissionOverwrites.push({
      id: staRole.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AddReactions,
      ],
      deny: [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.CreatePublicThreads,
        PermissionsBitField.Flags.CreatePrivateThreads,
      ],
    });

    // Staff: Founder, Admin, Mod bisa kirim pesan & kelola
    const staffRoles = [founderRole, adminRole, modRole].filter(Boolean);
    for (const r of staffRoles) {
      permissionOverwrites.push({
        id: r.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.MentionEveryone,
        ],
      });
    }

    // Cari posisi channel #survive-the-apocalypse agar channel pengumuman ditaruh persis di atasnya
    const staChatChannel = guild.channels.cache.find(c => c.name.includes('survive-the-apocalypse'));
    const position = staChatChannel ? staChatChannel.rawPosition : undefined;

    existingChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: catGaming ? catGaming.id : null,
      position: position,
      topic: '📢 Pengumuman, jadwal mabar, & update event khusus squad Survive The Apocalypse.',
      permissionOverwrites,
    });

    console.log(`Channel ${channelName} berhasil dibuat dengan ID: ${existingChannel.id}`);

    // Kirim pesan pembuka / welcome embed di channel pengumuman
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('📢 PENGUMUMAN SURVIVE THE APOCALYPSE')
      .setDescription(
        `Halo para penyintas <@&${staRole.id}>! 🧟‍♂️🔥\n\n` +
        `Channel ini adalah **papan pengumuman resmi** khusus untuk squad **Survive The Apocalypse**.\n\n` +
        `### 📌 Apa saja yang ada di sini?\n` +
        `• 📢 **Jadwal Mabar / Raid / Event** Survive The Apocalypse\n` +
        `• 🔄 **Update Info & Patch Notes** game / clan\n` +
        `• 🏆 **Tantangan, Turnamen, & Info Penting** lainnya\n\n` +
        `> 💡 *Nyalakan notifikasi channel ini agar kamu tidak ketinggalan info mabar dan event seru! Untuk ngobrol santai silakan ke channel <#${staChatChannel ? staChatChannel.id : 'survive-the-apocalypse'}>.*`
      )
      .setColor('#2ECC71')
      .setFooter({ text: 'Social High Five • STA Squad Announcement' })
      .setTimestamp();

    await existingChannel.send({ embeds: [welcomeEmbed] });
    console.log('Embed pembuka berhasil dikirim ke channel pengumuman!');
  }

  // Update server_config.json
  try {
    const configPath = 'server_config.json';
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.STA_ANNOUNCEMENTS_CHANNEL_ID = existingChannel.id;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('server_config.json berhasil diperbarui dengan STA_ANNOUNCEMENTS_CHANNEL_ID!');
    }
  } catch (err) {
    console.error('Gagal memperbarui server_config.json:', err);
  }

  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
