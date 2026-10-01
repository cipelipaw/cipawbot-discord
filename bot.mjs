import { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  AttachmentBuilder, 
  ActivityType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder
} from 'discord.js';
import fs from 'fs';

// Read .env
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
    GatewayIntentBits.MessageContent,
  ]
});

// Helper: Embed & Buttons Mabar Lobby (Max 5 Player)
export function createMabarEmbed(
  hostId, 
  playerIds, 
  agenda = 'Long Run / Raid Zombie', 
  jam = '19:00 WIB', 
  tanggal = 'Jumat, 2 Oktober 2026'
) {
  const maxSlots = 5;
  const isFull = playerIds.length >= maxSlots;
  
  let playerLines = [];
  for (let i = 0; i < maxSlots; i++) {
    if (i < playerIds.length) {
      const isHost = i === 0;
      playerLines.push(`**Slot ${i + 1}:** ${isHost ? '👑' : '🎮'} <@${playerIds[i]}> ${isHost ? '*(Host)*' : ''}`);
    } else {
      playerLines.push(`**Slot ${i + 1}:** ▫️ *(Kosong)*`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🧟 LOBBY MABAR: SURVIVE THE APOCALYPSE')
    .setDescription(
      `🔥 **Host:** <@${hostId}>\n` +
      `📅 **Tanggal:** ${tanggal}\n` +
      `⏰ **Waktu:** ${jam}\n` +
      `📢 **Agenda:** ${agenda}\n` +
      `👥 **Kapasitas:** **${playerIds.length}/${maxSlots} Player**\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `### 📋 Daftar Player:\n` +
      playerLines.join('\n') + '\n' +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      (isFull 
        ? `🔴 **SQUAD PENUH (5/5)!**\nSemua slot telah terisi. Siap berangkat mabar!` 
        : `🟢 **Tersedia ${maxSlots - playerIds.length} slot lagi!**\nKlik tombol **\`🎮 Ikutan Mabar\`** di bawah untuk masuk list otomatis.\n*(Jika tiba-tiba berhalangan, klik \`❌ Batal Ikut\`)*`)
    )
    .setColor(isFull ? '#ED4245' : '#2ECC71')
    .setFooter({ text: 'Social High Five • Mabar Party System' })
    .setTimestamp();

  return embed;
}

export function createMabarButtons(isFull) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_mabar_join')
      .setLabel('🎮 Ikutan Mabar')
      .setStyle(ButtonStyle.Success)
      .setDisabled(isFull),
    new ButtonBuilder()
      .setCustomId('btn_mabar_leave')
      .setLabel('❌ Batal Ikut')
      .setStyle(ButtonStyle.Danger)
  );
}

// Safe reply helper to avoid DiscordAPIError[40060]
async function safeReply(interaction, content) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  } catch (e) {
    console.error('Failed to reply to interaction:', e?.message || e);
  }
}

// Registrasi Slash Command /mabar
const mabarSlashCommand = new SlashCommandBuilder()
  .setName('mabar')
  .setDescription('Buka lobby ajakan mabar Survive The Apocalypse (Maksimal 5 Player)')
  .addStringOption(option =>
    option.setName('jam')
      .setDescription('Jam mabar (contoh: 19:00 WIB atau 21:00 WIB)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('agenda')
      .setDescription('Misi / agenda mabar (contoh: Long Run Wave, Boss Raid)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('tanggal')
      .setDescription('Tanggal pelaksanaan (default: Jumat, 2 Oktober 2026)')
      .setRequired(false));

client.on('clientReady', async () => {
  console.log(`===========================================`);
  console.log(`🤖 Bot Cipaw SIAP & AKTIF! (${client.user.tag})`);
  console.log(`Fitur Aktif: Verifikasi Member, Pemilihan Role, Welcome/Goodbye, & /mabar 5 Player.`);
  console.log(`===========================================`);

  try {
    const guild = await client.guilds.fetch(env.GUILD_ID);
    await guild.commands.set([mabarSlashCommand]);
    console.log('✅ Slash command /mabar berhasil didaftarkan ke server!');
  } catch (err) {
    console.error('Gagal mendaftarkan slash command:', err);
  }

  client.user.setPresence({
    activities: [{ name: 'Survive The Apocalypse 🧟', type: ActivityType.Playing }],
    status: 'online',
  });
});

// 1. EVENT: Member Baru Masuk (Welcome)
client.on('guildMemberAdd', async (member) => {
  console.log(`[JOIN] Member baru masuk: ${member.user.tag} (${member.id})`);
  try {
    const channel = await member.guild.channels.fetch(config.WELCOME_CHANNEL_ID);
    if (!channel) return;

    const welcomeFile = new AttachmentBuilder('welcome_banner.jpg');
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('✨ MEMBER BARU TELAH BERGABUNG! ✨')
      .setDescription(
        `Haii! 👋 Senang banget kamu akhirnya mampir dan bergabung di sini.\n` +
        `Jangan malu-malu buat ngobrol, kenalan, atau ikut seru-seruan bareng yang lain yaa!\n\n` +
        `🔹 Silakan baca & verifikasi di <#${config.RULES_CHANNEL_ID}> untuk membuka akses server!`
      )
      .setImage('attachment://welcome_banner.jpg')
      .setColor('#57F287')
      .setTimestamp();

    await channel.send({
      content: `🎉 Halo <@${member.id}>, selamat datang di server!`,
      files: [welcomeFile],
      embeds: [welcomeEmbed]
    });
  } catch (error) {
    console.error('Error saat menyambut member baru:', error);
  }
});

// 2. EVENT: Member Keluar Server (Goodbye)
client.on('guildMemberRemove', async (member) => {
  console.log(`[LEAVE] Member keluar: ${member.user.tag} (${member.id})`);
  try {
    const channel = await member.guild.channels.fetch(config.WELCOME_CHANNEL_ID);
    if (!channel) return;

    const goodbyeFile = new AttachmentBuilder('goodbye_banner.jpg');
    const goodbyeEmbed = new EmbedBuilder()
      .setTitle('💔 SAMPAI JUMPA!')
      .setDescription(
        `Untuk kalian yang masih ada di dalam server:\n` +
        `jangan lupa tetap ramein server ini ya! Jangan sampai satu-satu pergi juga 😭\n` +
        `Tetap ngobrol, bercanda, mabar, dan bikin server ini tetap hidup.`
      )
      .setImage('attachment://goodbye_banner.jpg')
      .setColor('#ED4245')
      .setTimestamp();

    await channel.send({
      content: `👋 **${member.user.username}** telah meninggalkan server.`,
      files: [goodbyeFile],
      embeds: [goodbyeEmbed]
    });
  } catch (error) {
    console.error('Error saat mengirim pesan perpisahan:', error);
  }
});

// 3. EVENT: Command Prefix (!mabar)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  if (content.startsWith('!mabar')) {
    const args = content.slice(6).trim();
    const agenda = args || 'Long Run / Raid Zombie';
    const jam = '19:00 WIB';
    const tanggal = 'Jumat, 2 Oktober 2026';

    const hostId = message.author.id;
    const initialPlayers = [hostId];

    const embed = createMabarEmbed(hostId, initialPlayers, agenda, jam, tanggal);
    const row = createMabarButtons(false);

    const staRoleTag = config.STA_ROLE_ID ? `<@&${config.STA_ROLE_ID}>` : '@here';

    // Target channel: pengumuman-sta
    const targetChannel = await message.guild.channels.fetch(config.STA_ANNOUNCEMENTS_CHANNEL_ID).catch(() => message.channel);

    await targetChannel.send({
      content: `📢 **JADWAL MABAR SURVIVE THE APOCALYPSE!**\nCc: ${staRoleTag}`,
      embeds: [embed],
      components: [row]
    });

    if (message.channel.id !== targetChannel.id) {
      await message.reply(`✅ Jadwal mabar untuk **${tanggal}** berhasil diposting ke <#${targetChannel.id}>!`);
    }
  }
});

// 4. EVENT: Interaksi Slash Command & Tombol
client.on('interactionCreate', async (interaction) => {
  // A. Handle Slash Command /mabar
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'mabar') {
      const jam = interaction.options.getString('jam') || '19:00 WIB';
      const agenda = interaction.options.getString('agenda') || 'Long Run / Raid Zombie';
      const tanggal = interaction.options.getString('tanggal') || 'Jumat, 2 Oktober 2026';

      const hostId = interaction.user.id;
      const initialPlayers = [hostId];

      const embed = createMabarEmbed(hostId, initialPlayers, agenda, jam, tanggal);
      const row = createMabarButtons(false);

      const staRoleTag = config.STA_ROLE_ID ? `<@&${config.STA_ROLE_ID}>` : '@here';

      const targetChannel = await interaction.guild.channels.fetch(config.STA_ANNOUNCEMENTS_CHANNEL_ID).catch(() => interaction.channel);

      if (interaction.channelId === targetChannel.id) {
        return interaction.reply({
          content: `📢 **JADWAL MABAR SURVIVE THE APOCALYPSE!**\nCc: ${staRoleTag}`,
          embeds: [embed],
          components: [row]
        });
      } else {
        await targetChannel.send({
          content: `📢 **JADWAL MABAR SURVIVE THE APOCALYPSE!**\nCc: ${staRoleTag}`,
          embeds: [embed],
          components: [row]
        });
        return interaction.reply({
          content: `✅ Jadwal mabar untuk **${tanggal}** berhasil diposting ke <#${targetChannel.id}>!`,
          flags: MessageFlags.Ephemeral
        });
      }
    }
    return;
  }

  // B. Handle Button Interactions
  if (!interaction.isButton()) return;

  const { customId, guild, member } = interaction;

  try {
    // Tombol Verifikasi di #rules
    if (customId === 'btn_verify_member') {
      const memberRole = guild.roles.cache.find(r => r.name.includes('Member'));
      if (!memberRole) {
        return safeReply(interaction, 'Role Member tidak ditemukan!');
      }

      if (member.roles.cache.has(memberRole.id)) {
        return safeReply(interaction, 'ℹ️ Kamu sudah terverifikasi sebagai Member sebelumnya!');
      }

      await member.roles.add(memberRole);
      return safeReply(
        interaction, 
        `✅ **Verifikasi Berhasil!**\nSelamat datang! Sekarang semua channel sudah terbuka untukmu.\n👉 Silakan lanjut ke channel <#${config.AMBIL_ROLE_CHANNEL_ID}> untuk memilih role Game & Gender kamu ya!`
      );
    }

    // Role Game: Survive The Apocalypse
    if (customId === 'role_sta') {
      const staRole = guild.roles.cache.find(r => r.name.includes('Survive The Apocalypse'));
      if (!staRole) return safeReply(interaction, 'Role tidak ditemukan.');

      if (member.roles.cache.has(staRole.id)) {
        await member.roles.remove(staRole);
        return safeReply(interaction, '❌ Role **Survive The Apocalypse** telah dilepas.');
      } else {
        await member.roles.add(staRole);
        return safeReply(
          interaction, 
          `🧟 Role **Survive The Apocalypse** berhasil didapatkan!\nSekarang kamu bisa cek pengumuman di <#${config.STA_ANNOUNCEMENTS_CHANNEL_ID}> dan ikutan chat di <#${config.STA_CHANNEL_ID}>.`
        );
      }
    }

    // Role Game: Roblox
    if (customId === 'role_roblox') {
      const robloxRole = guild.roles.cache.find(r => r.name.includes('Roblox'));
      if (!robloxRole) return safeReply(interaction, 'Role tidak ditemukan.');

      if (member.roles.cache.has(robloxRole.id)) {
        await member.roles.remove(robloxRole);
        return safeReply(interaction, '❌ Role **Roblox** telah dilepas.');
      } else {
        await member.roles.add(robloxRole);
        return safeReply(interaction, '🚗 Role **Roblox** berhasil didapatkan!');
      }
    }

    // Role Game: Mobile Legends
    if (customId === 'role_ml') {
      const mlRole = guild.roles.cache.find(r => r.name.includes('Mobile Legends'));
      if (!mlRole) return safeReply(interaction, 'Role tidak ditemukan.');

      if (member.roles.cache.has(mlRole.id)) {
        await member.roles.remove(mlRole);
        return safeReply(interaction, '❌ Role **Mobile Legends** telah dilepas.');
      } else {
        await member.roles.add(mlRole);
        return safeReply(interaction, '📱 Role **Mobile Legends** berhasil didapatkan!');
      }
    }

    // Gender Role: King (Biru)
    if (customId === 'role_king') {
      const kingRole = guild.roles.cache.find(r => r.name.includes('King'));
      const queenRole = guild.roles.cache.find(r => r.name.includes('Queen'));

      if (queenRole && member.roles.cache.has(queenRole.id)) {
        await member.roles.remove(queenRole);
      }
      await member.roles.add(kingRole);
      return safeReply(interaction, '👑 Role Gender **King (Biru)** berhasil dipasang!');
    }

    // Gender Role: Queen (Pink)
    if (customId === 'role_queen') {
      const kingRole = guild.roles.cache.find(r => r.name.includes('King'));
      const queenRole = guild.roles.cache.find(r => r.name.includes('Queen'));

      if (kingRole && member.roles.cache.has(kingRole.id)) {
        await member.roles.remove(kingRole);
      }
      await member.roles.add(queenRole);
      return safeReply(interaction, '🎀 Role Gender **Queen (Pink)** berhasil dipasang!');
    }

    // ============================================
    // FITUR: AUTO-LIST MABAR SQUAD (MAKSIMAL 5 ORANG)
    // ============================================
    if (customId === 'btn_mabar_join') {
      const embed = interaction.message.embeds[0];
      if (!embed || !embed.description) return;

      const hostMatch = embed.description.match(/🔥 \*\*Host:\*\* <@!?(\d+)>/);
      const tanggalMatch = embed.description.match(/📅 \*\*Tanggal:\*\* ([^\n]+)/);
      const jamMatch = embed.description.match(/⏰ \*\*Waktu:\*\* ([^\n]+)/);
      const agendaMatch = embed.description.match(/📢 \*\*Agenda:\*\* ([^\n]+)/);

      const hostId = hostMatch ? hostMatch[1] : interaction.user.id;
      const tanggal = tanggalMatch ? tanggalMatch[1] : 'Jumat, 2 Oktober 2026';
      const jam = jamMatch ? jamMatch[1] : '19:00 WIB';
      const agenda = agendaMatch ? agendaMatch[1] : 'Long Run / Raid Zombie';

      const playerMatches = [...embed.description.matchAll(/Slot \d+:\*\* [^\n]*<@!?(\d+)>/g)];
      let playerIds = playerMatches.map(m => m[1]);

      // 1. Cek apakah sudah terdaftar
      if (playerIds.includes(interaction.user.id)) {
        return safeReply(interaction, '⚠️ Kamu sudah terdaftar di squad mabar ini!');
      }

      // 2. Cek apakah slot sudah penuh (5 player)
      if (playerIds.length >= 5) {
        return safeReply(interaction, '❌ Maaf, kuota squad sudah penuh (5/5)!');
      }

      // Masukkan user baru ke slot
      playerIds.push(interaction.user.id);
      const isFull = playerIds.length >= 5;

      const newEmbed = createMabarEmbed(hostId, playerIds, agenda, jam, tanggal);
      const newRow = createMabarButtons(isFull);

      await interaction.update({ embeds: [newEmbed], components: [newRow] });

      // Jika pas 5 orang, beri notifikasi perayaan / instruksi voice channel
      if (isFull) {
        const voiceChannelId = config.STA_VOICE_ID || '1554714411548283050';
        await interaction.channel.send({
          content: `🎉🔥 **SQUAD SURVIVE THE APOCALYPSE LENGKAP (5/5)!**\n` +
            `Daftar Player: ${playerIds.map(id => `<@${id}>`).join(', ')}\n` +
            `Yuk langsung merapat ke voice channel <#${voiceChannelId}> untuk mulai mabar!`
        });
      }
      return;
    }

    if (customId === 'btn_mabar_leave') {
      const embed = interaction.message.embeds[0];
      if (!embed || !embed.description) return;

      const hostMatch = embed.description.match(/🔥 \*\*Host:\*\* <@!?(\d+)>/);
      const tanggalMatch = embed.description.match(/📅 \*\*Tanggal:\*\* ([^\n]+)/);
      const jamMatch = embed.description.match(/⏰ \*\*Waktu:\*\* ([^\n]+)/);
      const agendaMatch = embed.description.match(/📢 \*\*Agenda:\*\* ([^\n]+)/);

      const hostId = hostMatch ? hostMatch[1] : interaction.user.id;
      const tanggal = tanggalMatch ? tanggalMatch[1] : 'Jumat, 2 Oktober 2026';
      const jam = jamMatch ? jamMatch[1] : '19:00 WIB';
      const agenda = agendaMatch ? agendaMatch[1] : 'Long Run / Raid Zombie';

      const playerMatches = [...embed.description.matchAll(/Slot \d+:\*\* [^\n]*<@!?(\d+)>/g)];
      let playerIds = playerMatches.map(m => m[1]);

      // Host tidak bisa membatalkan slot utama
      if (interaction.user.id === hostId) {
        return safeReply(interaction, '⚠️ Kamu adalah Host! Host tidak dapat keluar dari squad.');
      }

      // Cek apakah user ada di list
      if (!playerIds.includes(interaction.user.id)) {
        return safeReply(interaction, '⚠️ Kamu belum terdaftar di dalam squad ini.');
      }

      // Hapus player dari slot
      playerIds = playerIds.filter(id => id !== interaction.user.id);

      const newEmbed = createMabarEmbed(hostId, playerIds, agenda, jam, tanggal);
      const newRow = createMabarButtons(false); // Tombol ikutan pasti aktif kembali karena ada slot kosong

      await interaction.update({ embeds: [newEmbed], components: [newRow] });
      return;
    }

  } catch (err) {
    console.error('Error handling interaction:', err);
    safeReply(interaction, 'Terjadi kendala saat memproses tindakan. Silakan coba lagi.');
  }
});

// Client and Process Error Handlers to prevent unexpected process exit
client.on('error', (err) => {
  console.error('[DISCORD CLIENT ERROR]', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});

client.login(env.BOT_TOKEN);
