import { 
  Client, 
  GatewayIntentBits, 
  ChannelType, 
  PermissionsBitField, 
  EmbedBuilder, 
  AttachmentBuilder 
} from 'discord.js';
import fs from 'fs';
import path from 'path';

// Read .env
const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=').trim();
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ]
});

client.once('ready', async () => {
  console.log(`Log in sebagai: ${client.user.tag}`);
  const guild = await client.guilds.fetch(env.GUILD_ID);
  if (!guild) {
    console.error('Server tidak ditemukan!');
    process.exit(1);
  }

  console.log(`Memulai pengaturan server: ${guild.name}...`);

  // 1. Bersihkan channel lama
  console.log('Menghapus channel lama...');
  const oldChannels = await guild.channels.fetch();
  for (const [id, ch] of oldChannels) {
    if (ch) {
      try {
        await ch.delete();
        console.log(`Dihapus: ${ch.name}`);
      } catch (err) {
        console.warn(`Gagal menghapus ${ch.name}: ${err.message}`);
      }
    }
  }

  // 2. Buat Roles
  console.log('Membuat roles...');
  const rolesData = [
    { name: '👑︱Founder', color: '#F1C40F', hoist: true, mentionable: true },
    { name: '🛡️︱Admin', color: '#E74C3C', hoist: true, mentionable: true },
    { name: '⚔️︱Moderator', color: '#3498DB', hoist: true, mentionable: true },
    { name: '💎︱VIP Member', color: '#E91E63', hoist: true, mentionable: false },
    { name: '🎮︱Gamer', color: '#2ECC71', hoist: true, mentionable: false },
    { name: '🧟︱Survive The Apocalypse', color: '#1ABC9C', hoist: false, mentionable: false },
    { name: '🚗︱Roblox Player', color: '#E67E22', hoist: false, mentionable: false },
    { name: '📱︱Mobile Legends', color: '#9B59B6', hoist: false, mentionable: false },
  ];

  const createdRoles = {};
  for (const r of rolesData) {
    // Cek apakah role sudah ada
    let existing = guild.roles.cache.find(role => role.name === r.name);
    if (!existing) {
      existing = await guild.roles.create({
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        mentionable: r.mentionable,
        reason: 'Setup gaming server roles',
      });
      console.log(`Role dibuat: ${r.name}`);
    }
    createdRoles[r.name] = existing;
  }

  const everyoneRole = guild.roles.everyone;

  // 3. Buat Kategori & Channel

  // --- KATEGORI 1: INFORMATION ---
  console.log('Membuat Kategori Information...');
  const catInfo = await guild.channels.create({
    name: '📌 ━━━ INFORMATION ━━━',
    type: ChannelType.GuildCategory,
  });

  const chRules = await guild.channels.create({
    name: '📜︱rules',
    type: ChannelType.GuildText,
    parent: catInfo.id,
    permissionOverwrites: [
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions],
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
      },
    ],
  });

  const chAnnounce = await guild.channels.create({
    name: '📢︱announcements',
    type: ChannelType.GuildText,
    parent: catInfo.id,
    permissionOverwrites: [
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.SendMessages],
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
      },
    ],
  });

  const chWelcome = await guild.channels.create({
    name: '👋︱welcome-goodbye',
    type: ChannelType.GuildText,
    parent: catInfo.id,
    permissionOverwrites: [
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.SendMessages],
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
      },
    ],
  });

  const chRolesInfo = await guild.channels.create({
    name: '🎭︱roles-info',
    type: ChannelType.GuildText,
    parent: catInfo.id,
    permissionOverwrites: [
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.SendMessages],
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
      },
    ],
  });


  // --- KATEGORI 2: COMMUNITY ---
  console.log('Membuat Kategori Community...');
  const catCommunity = await guild.channels.create({
    name: '💬 ━━━ COMMUNITY ━━━',
    type: ChannelType.GuildCategory,
  });

  const chPublicChat = await guild.channels.create({
    name: '🌐︱public-chat',
    type: ChannelType.GuildText,
    parent: catCommunity.id,
    topic: 'Ruang obrolan santai bersama semua member!',
  });

  const chBotCmd = await guild.channels.create({
    name: '🤖︱bot-commands',
    type: ChannelType.GuildText,
    parent: catCommunity.id,
    topic: 'Ketik perintah bot di sini agar tidak spam di chat utama.',
  });

  const chMedia = await guild.channels.create({
    name: '📸︱media-meme',
    type: ChannelType.GuildText,
    parent: catCommunity.id,
    topic: 'Bagi-bagi foto, meme, artwork, dan keseruan kalian!',
  });

  const chFeedback = await guild.channels.create({
    name: '💡︱saran-feedback',
    type: ChannelType.GuildText,
    parent: catCommunity.id,
    topic: 'Punya ide untuk server? Tulis saranmu di sini!',
  });


  // --- KATEGORI 3: GAMING ZONE ---
  console.log('Membuat Kategori Gaming Zone...');
  const catGaming = await guild.channels.create({
    name: '🎮 ━━━ GAMING ZONE ━━━',
    type: ChannelType.GuildCategory,
  });

  const chSTA = await guild.channels.create({
    name: '🧟︱survive-the-apocalypse',
    type: ChannelType.GuildText,
    parent: catGaming.id,
    topic: 'Khusus Roblox: Survive The Apocalypse! Mabar, strategi bertahan hidup, & info game!',
  });

  const chRoblox = await guild.channels.create({
    name: '🚗︱roblox-community',
    type: ChannelType.GuildText,
    parent: catGaming.id,
    topic: 'Diskusi & ajakan mabar untuk game-game Roblox lainnya.',
  });

  const chML = await guild.channels.create({
    name: '📱︱mobile-legends',
    type: ChannelType.GuildText,
    parent: catGaming.id,
    topic: 'Mobile Legends: Bang Bang! Cari squad, share build, rank up bareng!',
  });

  const chClips = await guild.channels.create({
    name: '🏆︱clip-highlights',
    type: ChannelType.GuildText,
    parent: catGaming.id,
    topic: 'Pamer momen epic kill, clutching, savage, atau glitch lucu!',
  });


  // --- KATEGORI 4: VOICE CHANNELS ---
  console.log('Membuat Kategori Voice...');
  const catVoice = await guild.channels.create({
    name: '🔊 ━━━ VOICE CHANNELS ━━━',
    type: ChannelType.GuildCategory,
  });

  await guild.channels.create({
    name: '🔊︱Nongkrong Santai',
    type: ChannelType.GuildVoice,
    parent: catVoice.id,
  });

  await guild.channels.create({
    name: '🧟︱STA Squad',
    type: ChannelType.GuildVoice,
    parent: catVoice.id,
    userLimit: 4,
  });

  await guild.channels.create({
    name: '📱︱ML Mabar 5v5',
    type: ChannelType.GuildVoice,
    parent: catVoice.id,
    userLimit: 5,
  });

  await guild.channels.create({
    name: '🚗︱Roblox Voice',
    type: ChannelType.GuildVoice,
    parent: catVoice.id,
  });

  await guild.channels.create({
    name: '👥︱Duo Room',
    type: ChannelType.GuildVoice,
    parent: catVoice.id,
    userLimit: 2,
  });

  await guild.channels.create({
    name: '🎵︱Music Room',
    type: ChannelType.GuildVoice,
    parent: catVoice.id,
  });


  // --- KATEGORI 5: STAFF ONLY ---
  console.log('Membuat Kategori Staff...');
  const catStaff = await guild.channels.create({
    name: '🔒 ━━━ STAFF ROOM ━━━',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: createdRoles['🛡️︱Admin'].id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
      {
        id: createdRoles['⚔️︱Moderator'].id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
      {
        id: createdRoles['👑︱Founder'].id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
      },
    ],
  });

  await guild.channels.create({
    name: '💬︱staff-chat',
    type: ChannelType.GuildText,
    parent: catStaff.id,
  });

  await guild.channels.create({
    name: '🚨︱mod-logs',
    type: ChannelType.GuildText,
    parent: catStaff.id,
  });

  await guild.channels.create({
    name: '🔒︱Staff Voice',
    type: ChannelType.GuildVoice,
    parent: catStaff.id,
  });


  // 4. Kirim Pesan Awal & Embeds
  console.log('Mengirim pesan awal estetis ke channel info...');

  // Kirim Rules
  const rulesEmbed = new EmbedBuilder()
    .setTitle('📜 PERATURAN SERVER')
    .setDescription('Selamat datang di server! Harap patuhi aturan berikut agar komunitas kita tetap seru, aman, dan nyaman untuk semua orang.')
    .setColor('#5865F2')
    .addFields(
      { name: '1. Saling Menghargai & Sopan', value: 'Hormati sesama member. Dilarang toxic berlebihan, SARA, pelecehan, atau ujaran kebencian.' },
      { name: '2. Dilarang Spam', value: 'Jangan melakukan spam chat, mention berulang kali, atau membanjiri channel dengan pesan yang tidak perlu.' },
      { name: '3. Gunakan Channel Sesuai Fungsinya', value: 'Kirim gambar di `#media-meme`, obrolan game di kategori gaming, dan perintah bot di `#bot-commands`.' },
      { name: '4. Dilarang Promosi Tanpa Izin', value: 'Dilarang membagikan link invite server lain atau promosi komersial tanpa persetujuan Admin/Founder.' },
      { name: '5. Keputusan Staff Bersifat Mutlak', value: 'Jika ada masalah atau pelanggaran, laporkan ke Staff / Moderator.' }
    )
    .setFooter({ text: 'Terima kasih sudah menjaga kenyamanan server bersama!' })
    .setTimestamp();

  await chRules.send({ embeds: [rulesEmbed] });

  // Kirim Welcome Preview Banner di #welcome-goodbye
  const welcomeFile = new AttachmentBuilder('welcome_banner.jpg');
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('👋 SELAMAT DATANG DI SERVER!')
    .setDescription(
      `Haii! 👋 Senang banget kamu akhirnya mampir dan bergabung di sini.\n\n` +
      `Jangan malu-malu buat ngobrol, kenalan, atau ikut seru-seruan bareng yang lain yaa!\n\n` +
      `🔹 Baca rules di ${chRules}\n` +
      `🔹 Mulai ngobrol di ${chPublicChat}\n` +
      `🔹 Main game bareng di ${chSTA} & ${chML}!`
    )
    .setImage('attachment://welcome_banner.jpg')
    .setColor('#2ECC71')
    .setTimestamp();

  await chWelcome.send({
    content: '**🎉 Official Welcome Channel**',
    files: [welcomeFile],
    embeds: [welcomeEmbed]
  });

  // Kirim Info Roles di #roles-info
  const rolesEmbed = new EmbedBuilder()
    .setTitle('🎭 DAFTAR ROLE SERVER')
    .setDescription('Berikut adalah tingkatan role yang ada di server:')
    .setColor('#F1C40F')
    .addFields(
      { name: '👑︱Founder', value: 'Pemilik server.' },
      { name: '🛡️︱Admin', value: 'Pengelola keamanan & sistem server.' },
      { name: '⚔️︱Moderator', value: 'Penjaga ketertiban & kenyamanan komunitas.' },
      { name: '💎︱VIP Member', value: 'Member spesial & donatur server.' },
      { name: '🎮︱Gamer', value: 'Role untuk semua member aktif.' },
      { name: 'Game Roles:', value: '• `🧟︱Survive The Apocalypse` (Roblox STA)\n• `🚗︱Roblox Player`\n• `📱︱Mobile Legends`' }
    )
    .setFooter({ text: 'Hubungi staff untuk klaim role game kamu!' });

  await chRolesInfo.send({ embeds: [rolesEmbed] });

  // Kirim Salam Pembuka di #public-chat
  await chPublicChat.send({
    content: '🎉 **Halo semuanya! Selamat datang di channel obrolan utama `#public-chat`!**\nSilakan saling menyapa, kenalan, dan ngobrol santai di sini yaa! ✨'
  });

  // Kirim Salam Pembuka di #survive-the-apocalypse
  await chSTA.send({
    content: '🧟‍♂️ **Selamat datang di bunker Survivor!**\nChannel ini khusus untuk mabar **Roblox: Survive The Apocalypse**! Share username Roblox kamu, strategi bertahan dari zombie, dan mari kita bertahan hidup bersama! 🔥'
  });

  // Simpan Channel ID ke file config agar bot welcome/goodbye bisa pakai
  const config = {
    WELCOME_CHANNEL_ID: chWelcome.id,
    PUBLIC_CHAT_ID: chPublicChat.id,
    RULES_CHANNEL_ID: chRules.id,
  };
  fs.writeFileSync('server_config.json', JSON.stringify(config, null, 2));

  console.log('\nSETUP SELESAI DENGAN SEMPURNA! 🎉');
  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
