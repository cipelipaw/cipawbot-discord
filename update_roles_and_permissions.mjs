import { 
  Client, 
  GatewayIntentBits, 
  PermissionsBitField, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder 
} from 'discord.js';
import fs from 'fs';

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

client.on('clientReady', async () => {
  console.log(`Log in sebagai: ${client.user.tag}`);
  const guild = await client.guilds.fetch(env.GUILD_ID);

  // 1. Update Role Founder color to #00fff7
  console.log('Mengubah warna Founder ke #00fff7...');
  let founderRole = guild.roles.cache.find(r => r.name.includes('Founder'));
  if (founderRole) {
    await founderRole.setColor('#00fff7');
    console.log('Warna Founder berhasil diubah ke #00fff7');
  }

  // 2. Rename or ensure Member role
  let memberRole = guild.roles.cache.find(r => r.name.includes('Gamer') || r.name.includes('Member'));
  if (memberRole && memberRole.name !== '🎮︱Member') {
    await memberRole.setName('🎮︱Member');
    console.log('Role Gamer diubah namanya menjadi 🎮︱Member');
  }

  // 3. Ensure Gender Roles (King & Queen)
  console.log('Membuat / memastikan role King & Queen...');
  let kingRole = guild.roles.cache.find(r => r.name.includes('King'));
  if (!kingRole) {
    kingRole = await guild.roles.create({
      name: '👑︱King',
      color: '#3498DB', // Biru
      hoist: false,
      reason: 'Gender role King',
    });
    console.log('Role King dibuat!');
  } else {
    await kingRole.setColor('#3498DB');
  }

  let queenRole = guild.roles.cache.find(r => r.name.includes('Queen'));
  if (!queenRole) {
    queenRole = await guild.roles.create({
      name: '🎀︱Queen',
      color: '#FF69B4', // Pink
      hoist: false,
      reason: 'Gender role Queen',
    });
    console.log('Role Queen dibuat!');
  } else {
    await queenRole.setColor('#FF69B4');
  }

  // 4. Ensure Game Roles
  let staRole = guild.roles.cache.find(r => r.name.includes('Survive The Apocalypse'));
  let robloxRole = guild.roles.cache.find(r => r.name.includes('Roblox'));
  let mlRole = guild.roles.cache.find(r => r.name.includes('Mobile Legends'));

  if (robloxRole && robloxRole.name !== '🚗︱Roblox') {
    await robloxRole.setName('🚗︱Roblox');
  }

  // 5. Delete #bot-commands channel if exists
  console.log('Menghapus channel #bot-commands...');
  const channels = await guild.channels.fetch();
  for (const [id, ch] of channels) {
    if (ch && ch.name.includes('bot-commands')) {
      await ch.delete();
      console.log('Channel bot-commands berhasil dihapus!');
    }
  }

  // 6. Rename #roles-info to #ambil-role
  let chAmbilRole = guild.channels.cache.find(c => c.name.includes('roles-info') || c.name.includes('ambil-role'));
  if (chAmbilRole) {
    await chAmbilRole.setName('🎭︱ambil-role');
    // Clear old messages in chAmbilRole
    const msgs = await chAmbilRole.messages.fetch({ limit: 10 });
    for (const [mid, m] of msgs) await m.delete().catch(() => {});
  }

  // Find other channels
  const chRules = guild.channels.cache.find(c => c.name.includes('rules'));
  const chWelcome = guild.channels.cache.find(c => c.name.includes('welcome-goodbye'));
  const chAnnounce = guild.channels.cache.find(c => c.name.includes('announcements'));
  const chSTA = guild.channels.cache.find(c => c.name.includes('survive-the-apocalypse'));
  
  // Categories
  const catInfo = guild.channels.cache.find(c => c.name.includes('INFORMATION'));
  const catCommunity = guild.channels.cache.find(c => c.name.includes('COMMUNITY'));
  const catGaming = guild.channels.cache.find(c => c.name.includes('GAMING ZONE'));
  const catVoice = guild.channels.cache.find(c => c.name.includes('VOICE CHANNELS'));

  const everyoneRole = guild.roles.everyone;

  // 7. Set Permissions: Sebelum member pilih role, HANYA BISA LIHAT RULES!
  console.log('Mengatur permissions: @everyone hanya bisa melihat #rules...');

  // Rules: Visible to @everyone, cannot send messages
  if (chRules) {
    await chRules.permissionOverwrites.set([
      {
        id: everyoneRole.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
        deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions],
      },
    ]);
  }

  // Welcome-goodbye, Announcements, Ambil-role: Deny @everyone, Allow Member
  const infoSubChannels = [chWelcome, chAnnounce, chAmbilRole];
  for (const ch of infoSubChannels) {
    if (ch) {
      await ch.permissionOverwrites.set([
        {
          id: everyoneRole.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: memberRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages],
        },
      ]);
    }
  }

  // Category Community: Deny @everyone, Allow Member
  if (catCommunity) {
    await catCommunity.permissionOverwrites.set([
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
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.EmbedLinks,
        ],
      },
    ]);
  }

  // Category Gaming Zone: Deny @everyone, Allow Member
  if (catGaming) {
    await catGaming.permissionOverwrites.set([
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
        ],
      },
    ]);
  }

  // Khusus channel #survive-the-apocalypse:
  // Member biasa hanya bisa LIHAT, tapi TIDAK BISA CHAT KECUALI PUNYA ROLE Survive The Apocalypse!
  if (chSTA && staRole) {
    await chSTA.permissionOverwrites.set([
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: memberRole.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
        deny: [PermissionsBitField.Flags.SendMessages], // Dilarang chat sebelum ambil role STA!
      },
      {
        id: staRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.AttachFiles,
        ],
      },
    ]);
    console.log('Channel #survive-the-apocalypse dikunci chat-nya khusus untuk pemegang role STA!');
  }

  // Category Voice: Deny @everyone, Allow Member
  if (catVoice) {
    await catVoice.permissionOverwrites.set([
      {
        id: everyoneRole.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: memberRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
        ],
      },
    ]);
  }

  // 8. Update Pesan di #rules dengan Tombol Verifikasi Ceklis
  if (chRules) {
    console.log('Mengirim pesan verifikasi interaktif di #rules...');
    // Clear old messages in rules
    const oldMsgs = await chRules.messages.fetch({ limit: 10 });
    for (const [mid, m] of oldMsgs) await m.delete().catch(() => {});

    const rulesEmbed = new EmbedBuilder()
      .setTitle('📜 PERATURAN SERVER SOCIAL HIGH FIVE')
      .setDescription(
        'Selamat datang di server! Harap baca peraturan di bawah ini dengan seksama.\n\n' +
        '**1. Saling Menghargai & Sopan**\n' +
        'Hormati sesama member. Dilarang toxic berlebihan, SARA, pelecehan, atau ujaran kebencian.\n\n' +
        '**2. Dilarang Spam**\n' +
        'Jangan spam chat, mention berlebihan, atau membanjiri channel dengan pesan tak bermakna.\n\n' +
        '**3. Gunakan Channel Sesuai Fungsinya**\n' +
        'Kirim obrolan di `#public-chat`, gambar di `#media-meme`, dan mabar di kategori game.\n\n' +
        '**4. Dilarang Promosi Tanpa Izin**\n' +
        'Dilarang promosi server lain / komersial tanpa persetujuan Owner / Admin.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '👉 **CARA MENDAPATKAN AKSES SERVER:**\n' +
        'Klik tombol centang **`✅ Verifikasi Member`** di bawah ini untuk membuka semua channel dan lanjut memilih role game & gender!'
      )
      .setColor('#00fff7')
      .setFooter({ text: 'Klik tombol di bawah untuk verifikasi' });

    const verifyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_verify_member')
        .setLabel('✅ Verifikasi Member')
        .setStyle(ButtonStyle.Success)
    );

    await chRules.send({
      embeds: [rulesEmbed],
      components: [verifyRow],
    });
  }

  // 9. Kirim Menu Pemilihan Role di #ambil-role
  if (chAmbilRole) {
    console.log('Mengirim menu pilihan role di #ambil-role...');
    const roleEmbed = new EmbedBuilder()
      .setTitle('🎭 PILIH ROLE GAME & GENDER KAMU')
      .setDescription(
        'Silakan klik tombol di bawah untuk memilih role kamu.\n' +
        'Kamu bisa memilih **semua game** yang kamu mainkan!\n' +
        '*(Klik lagi tombol yang sama jika ingin membatalkan/melepas role)*\n\n' +
        '🎮 **PILIHAN GAME:**\n' +
        '• 🧟 `Survive The Apocalypse` - **Wajib dipilih** agar kamu bisa ikutan chat & mabar di channel `#survive-the-apocalypse`!\n' +
        '• 🚗 `Roblox` - Menandai kamu adalah pemain Roblox.\n' +
        '• 📱 `Mobile Legends` - Menandai kamu adalah pemain MLBB.\n\n' +
        '👤 **PILIHAN GENDER:**\n' +
        '• 👑 `King` (Warna Biru)\n' +
        '• 🎀 `Queen` (Warna Pink)'
      )
      .setColor('#5865F2')
      .setFooter({ text: 'Klik tombol di bawah untuk ambil / lepas role secara instan' });

    // Baris 1: Game Roles
    const gameRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('role_sta')
        .setLabel('🧟 Survive The Apocalypse')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('role_roblox')
        .setLabel('🚗 Roblox')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('role_ml')
        .setLabel('📱 Mobile Legend')
        .setStyle(ButtonStyle.Primary)
    );

    // Baris 2: Gender Roles
    const genderRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('role_king')
        .setLabel('👑 King (Biru)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('role_queen')
        .setLabel('🎀 Queen (Pink)')
        .setStyle(ButtonStyle.Secondary)
    );

    await chAmbilRole.send({
      embeds: [roleEmbed],
      components: [gameRow, genderRow],
    });
  }

  console.log('Pembaruan roles, channel, dan permissions SELESAI!');
  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
