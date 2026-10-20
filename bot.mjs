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
  SlashCommandBuilder, 
  ChannelType, 
  PermissionsBitField, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
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

// Cache untuk foto/banner yang diunggah via Slash Command sebelum Modal submit
const pendingPhotos = new Map();

// Helper untuk mengambil foto dari Text Input link ATAU dari upload file attachment
function getAttachedOrLinkedPhoto(interaction, textInputId) {
  let photoUrl = '';
  if (textInputId) {
    try {
      const val = interaction.fields.getTextInputValue(textInputId)?.trim();
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        photoUrl = val;
      }
    } catch (_) {}
  }
  if (!photoUrl && pendingPhotos.has(interaction.user.id)) {
    const cached = pendingPhotos.get(interaction.user.id);
    if (Date.now() - cached.timestamp < 15 * 60 * 1000) {
      photoUrl = cached.url;
    }
  }
  pendingPhotos.delete(interaction.user.id);
  return photoUrl;
}

// Helper: Embed & Buttons Mabar Lobby (Kapasitas Dinamis 2 - 10 Player + Dukungan Banner Foto)
export function createMabarEmbed(
  hostId, 
  playerIds, 
  agenda = 'Long Run / Mabar Santai', 
  jam = '19:00 WIB', 
  tanggal = 'Sabtu, 18 Oktober 2026',
  judul = 'LOBBY MABAR',
  kapasitas = 5,
  catatan = '',
  imageUrl = ''
) {
  const maxSlots = Math.min(Math.max(parseInt(kapasitas, 10) || 5, 2), 10);
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

  let desc = `🔥 **Host:** <@${hostId}>\n` +
    `📅 **Tanggal:** ${tanggal}\n` +
    `⏰ **Waktu:** ${jam}\n` +
    `🎯 **Agenda:** ${agenda}\n` +
    `👥 **Kapasitas:** **${playerIds.length}/${maxSlots} Player**\n`;

  if (catatan) {
    desc += `📝 **Catatan:** ${catatan}\n`;
  }

  desc += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `### 📋 Daftar Player:\n` +
    playerLines.join('\n') + '\n' +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    (isFull 
      ? `🔴 **SQUAD PENUH (${maxSlots}/${maxSlots})!**\nSemua slot telah terisi. Siap berangkat mabar!` 
      : `🟢 **Tersedia ${maxSlots - playerIds.length} slot lagi!**\nKlik tombol **\`🎮 Ikutan Mabar\`** di bawah untuk masuk list otomatis.\n*(Jika tiba-tiba berhalangan, klik \`❌ Batal Ikut\`)*`);

  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${judul.toUpperCase()}`)
    .setDescription(desc)
    .setColor(isFull ? '#ED4245' : '#2ECC71')
    .setFooter({ text: 'Social High Five • Mabar Party System' })
    .setTimestamp();

  if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    embed.setImage(imageUrl);
  }

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

// 1. Registrasi Slash Command: /mabar #channel-tujuan [foto]
const mabarSlashCommand = new SlashCommandBuilder()
  .setName('mabar')
  .setDescription('Buka lobby mabar interaktif (Judul, Tanggal, Waktu, Agenda, & Kapasitas 2-10)')
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Pilih channel target untuk mengirimkan ajakan mabar')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
  .addAttachmentOption(option =>
    option.setName('foto')
      .setDescription('Upload foto/banner ajakan mabar (opsional)')
      .setRequired(false));

// Alias /buatmabar & /lobby
const buatMabarCommand = new SlashCommandBuilder()
  .setName('buatmabar')
  .setDescription('Buka form ajakan mabar interaktif (Kapasitas 2-10 player)')
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Pilih channel target untuk mengirimkan ajakan mabar')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
  .addAttachmentOption(option =>
    option.setName('foto')
      .setDescription('Upload foto/banner ajakan mabar (opsional)')
      .setRequired(false));

const lobbyCommand = new SlashCommandBuilder()
  .setName('lobby')
  .setDescription('Buka form lobby mabar interaktif (Kapasitas 2-10 player)')
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Pilih channel target untuk mengirimkan ajakan mabar')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
  .addAttachmentOption(option =>
    option.setName('foto')
      .setDescription('Upload foto/banner ajakan mabar (opsional)')
      .setRequired(false));

// 2. Registrasi Slash Command: /bcall #channel-tujuan [foto]
const bcallCommand = new SlashCommandBuilder()
  .setName('bcall')
  .setDescription('Broadcast informasi game / pengumuman penting ke channel pilihan')
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Pilih channel target untuk mengirimkan informasi')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
  .addAttachmentOption(option =>
    option.setName('foto')
      .setDescription('Upload foto/banner pengumuman (opsional)')
      .setRequired(false));

// 3. Registrasi Slash Command: /bcsta1 #channel-tujuan [foto]
const bcsta1Command = new SlashCommandBuilder()
  .setName('bcsta1')
  .setDescription('Broadcast jadwal mabar Survive The Apocalypse ke channel pilihan')
  .addChannelOption(option =>
    option.setName('channel')
      .setDescription('Pilih channel target untuk mengirim pengumuman mabar')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
  .addAttachmentOption(option =>
    option.setName('foto')
      .setDescription('Upload foto/poster jadwal mabar (opsional)')
      .setRequired(false));

client.on('clientReady', async () => {
  console.log(`===========================================`);
  console.log(`🤖 Bot Cipaw SIAP & AKTIF! (${client.user.tag})`);
  console.log(`Fitur Aktif: Verifikasi Member, Role Picker, /buatmabar, /lobby, /mabar, /bcall, & /bcsta1.`);
  console.log(`===========================================`);

  try {
    const guild = await client.guilds.fetch(env.GUILD_ID);
    await guild.commands.set([buatMabarCommand, lobbyCommand, mabarSlashCommand, bcallCommand, bcsta1Command]);
    console.log('✅ Slash commands /buatmabar, /lobby, /mabar, /bcall, & /bcsta1 berhasil didaftarkan ke server!');
  } catch (err) {
    console.error('Gagal mendaftarkan slash commands:', err);
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

// 3. EVENT: Interaksi Slash Command, Modal Form, & Tombol
client.on('interactionCreate', async (interaction) => {
  // A. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const isStaff = interaction.member.roles.cache.some(r => 
      r.name.includes('Founder') || r.name.includes('Admin') || r.name.includes('Moderator')
    ) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!isStaff) {
      return interaction.reply({
        content: '❌ **Akses Ditolak!** Hanya Founder, Admin, dan Moderator yang dapat menggunakan perintah prompt ini.',
        flags: MessageFlags.Ephemeral
      });
    }

    const targetChannel = interaction.options.getChannel('channel');
    if (!targetChannel) {
      return interaction.reply({
        content: '❌ Channel tujuan tidak valid atau tidak ditemukan.',
        flags: MessageFlags.Ephemeral
      });
    }

    // Tangkap attachment foto (jika ada yang diunggah langsung di command)
    const fotoAttachment = interaction.options.getAttachment('foto');
    if (fotoAttachment && fotoAttachment.url) {
      pendingPhotos.set(interaction.user.id, {
        url: fotoAttachment.url,
        timestamp: Date.now()
      });
    }

    // 1. Command /buatmabar, /lobby, /mabar #channel-tujuan (Modal Mabar dengan Kapasitas 2-10)
    if (interaction.commandName === 'mabar' || interaction.commandName === 'buatmabar' || interaction.commandName === 'lobby') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_mabar_${targetChannel.id}`)
        .setTitle('🎮 Form Ajakan Mabar');

      const judulInput = new TextInputBuilder()
        .setCustomId('mabar_judul')
        .setLabel('Judul Mabar')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: MABAR SURVIVE THE APOCALYPSE / MLBB')
        .setValue('MABAR SURVIVE THE APOCALYPSE')
        .setRequired(true);

      const tanggalInput = new TextInputBuilder()
        .setCustomId('mabar_tanggal')
        .setLabel('Tanggal')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Sabtu, 18 Oktober 2026')
        .setRequired(true);

      const waktuInput = new TextInputBuilder()
        .setCustomId('mabar_waktu')
        .setLabel('Waktu')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 19:00 WIB atau 20:00 WIB')
        .setValue('19:00 WIB')
        .setRequired(true);

      const agendaInput = new TextInputBuilder()
        .setCustomId('mabar_agenda')
        .setLabel('Agenda')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Long Run / Mabar Santai / Push Rank')
        .setValue('Long Run / Mabar Santai')
        .setRequired(true);

      const kapasitasInput = new TextInputBuilder()
        .setCustomId('mabar_kapasitas')
        .setLabel('Kapasitas (2 - 10 Orang)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ketik angka antara 2 sampai 10 (contoh: 5)')
        .setValue('5')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(judulInput),
        new ActionRowBuilder().addComponents(tanggalInput),
        new ActionRowBuilder().addComponents(waktuInput),
        new ActionRowBuilder().addComponents(agendaInput),
        new ActionRowBuilder().addComponents(kapasitasInput)
      );

      return interaction.showModal(modal);
    }

    // 2. Command /bcall #channel-tujuan (Modal Informasi Game / Pengumuman)
    if (interaction.commandName === 'bcall') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_bcall_${targetChannel.id}`)
        .setTitle('📢 Broadcast Informasi Game');

      const judulInput = new TextInputBuilder()
        .setCustomId('bcall_judul')
        .setLabel('Judul Informasi / Game')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: UPDATE SURVIVE THE APOCALYPSE / INFO EVENT MLBB')
        .setRequired(true);

      const infoInput = new TextInputBuilder()
        .setCustomId('bcall_info')
        .setLabel('Isi Informasi / Pengumuman')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Tuliskan detail informasi, update, atau pengumuman seputar game di sini...')
        .setRequired(true);

      const catatanInput = new TextInputBuilder()
        .setCustomId('bcall_catatan')
        .setLabel('Catatan Tambahan / Link Sumber (Opsional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Link patch notes atau instruksi tambahan')
        .setRequired(false);

      const fotoInput = new TextInputBuilder()
        .setCustomId('bcall_foto')
        .setLabel('Link Foto / Banner (Opsional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://... (atau upload langsung saat ketik /bcall)')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(judulInput),
        new ActionRowBuilder().addComponents(infoInput),
        new ActionRowBuilder().addComponents(catatanInput),
        new ActionRowBuilder().addComponents(fotoInput)
      );

      return interaction.showModal(modal);
    }

    // 3. Command /bcsta1 #channel-tujuan (Kompatibilitas)
    if (interaction.commandName === 'bcsta1') {
      const modal = new ModalBuilder()
        .setCustomId(`modal_bcsta1_${targetChannel.id}`)
        .setTitle('📢 Broadcast Jadwal Mabar STA');

      const tanggalInput = new TextInputBuilder()
        .setCustomId('bc_tanggal')
        .setLabel('Tanggal Pelaksanaan')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Sabtu, 18 Oktober 2026')
        .setRequired(true);

      const jamInput = new TextInputBuilder()
        .setCustomId('bc_jam')
        .setLabel('Waktu / Jam')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 19:00 WIB')
        .setValue('19:00 WIB')
        .setRequired(true);

      const agendaInput = new TextInputBuilder()
        .setCustomId('bc_agenda')
        .setLabel('Agenda Misi Mabar')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Long Run / Mabar Santai / Push Wave')
        .setValue('Long Run / Mabar Santai')
        .setRequired(true);

      const catatanInput = new TextInputBuilder()
        .setCustomId('bc_catatan')
        .setLabel('Catatan Tambahan (Opsional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Contoh: Wajib bawa senjata level 3!')
        .setRequired(false);

      const fotoInput = new TextInputBuilder()
        .setCustomId('bc_foto')
        .setLabel('Link Foto / Banner (Opsional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://... (atau upload langsung saat ketik /bcsta1)')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(tanggalInput),
        new ActionRowBuilder().addComponents(jamInput),
        new ActionRowBuilder().addComponents(agendaInput),
        new ActionRowBuilder().addComponents(catatanInput),
        new ActionRowBuilder().addComponents(fotoInput)
      );

      return interaction.showModal(modal);
    }

    return;
  }

  // B. Handle Modal Submissions
  if (interaction.isModalSubmit()) {
    // 1. Submit Modal /mabar
    if (interaction.customId.startsWith('modal_mabar_')) {
      const targetChannelId = interaction.customId.replace('modal_mabar_', '');
      const judul = interaction.fields.getTextInputValue('mabar_judul').trim();
      const tanggal = interaction.fields.getTextInputValue('mabar_tanggal').trim();
      const waktu = interaction.fields.getTextInputValue('mabar_waktu').trim();
      const agenda = interaction.fields.getTextInputValue('mabar_agenda').trim();
      const kapasitasRaw = interaction.fields.getTextInputValue('mabar_kapasitas').trim();

      let kapasitas = parseInt(kapasitasRaw, 10);
      if (isNaN(kapasitas) || kapasitas < 2) kapasitas = 2;
      if (kapasitas > 10) kapasitas = 10;

      const hostId = interaction.user.id;
      const playerIds = [hostId];

      const imageUrl = getAttachedOrLinkedPhoto(interaction, null);
      const embed = createMabarEmbed(hostId, playerIds, agenda, waktu, tanggal, judul, kapasitas, '', imageUrl);
      const row = createMabarButtons(false);

      const targetChannel = await interaction.guild.channels.fetch(targetChannelId).catch(() => null);
      if (!targetChannel) {
        return interaction.reply({
          content: '❌ Channel target tidak ditemukan.',
          flags: MessageFlags.Ephemeral
        });
      }

      const roleTag = config.STA_ROLE_ID ? `<@&${config.STA_ROLE_ID}>` : '@here';

      const sentMsg = await targetChannel.send({
        content: `📢 **AJAKAN MABAR: ${judul.toUpperCase()}!**\nCc: ${roleTag}`,
        embeds: [embed],
        components: [row]
      });

      return interaction.reply({
        content: `✅ **Berhasil!** Lobby mabar **"${judul}"** (Kapasitas: ${kapasitas} orang) telah diposting ke <#${targetChannelId}>!\n🔗 [Klik untuk melihat pesan](${sentMsg.url})`,
        flags: MessageFlags.Ephemeral
      });
    }

    // 2. Submit Modal /bcall
    if (interaction.customId.startsWith('modal_bcall_')) {
      const targetChannelId = interaction.customId.replace('modal_bcall_', '');
      const judul = interaction.fields.getTextInputValue('bcall_judul').trim();
      const info = interaction.fields.getTextInputValue('bcall_info').trim();
      const catatan = interaction.fields.getTextInputValue('bcall_catatan')?.trim();
      const imageUrl = getAttachedOrLinkedPhoto(interaction, 'bcall_foto');

      const targetChannel = await interaction.guild.channels.fetch(targetChannelId).catch(() => null);
      if (!targetChannel) {
        return interaction.reply({
          content: '❌ Channel target tidak ditemukan.',
          flags: MessageFlags.Ephemeral
        });
      }

      let desc = `${info}\n\n`;
      if (catatan) {
        desc += `📌 **Catatan / Link:**\n${catatan}\n\n`;
      }
      desc += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `👤 *Diumumkan oleh:* <@${interaction.user.id}>`;

      const infoEmbed = new EmbedBuilder()
        .setTitle(`📢 ${judul.toUpperCase()}`)
        .setDescription(desc)
        .setColor('#00fff7')
        .setFooter({ text: 'Social High Five • Game Information Broadcast' })
        .setTimestamp();

      if (imageUrl) {
        infoEmbed.setImage(imageUrl);
      }

      const sentMsg = await targetChannel.send({
        content: '@everyone',
        embeds: [infoEmbed]
      });

      return interaction.reply({
        content: `✅ **Berhasil!** Informasi **"${judul}"** telah dibroadcast ke <#${targetChannelId}>!\n🔗 [Klik untuk melihat pesan](${sentMsg.url})`,
        flags: MessageFlags.Ephemeral
      });
    }

    // 3. Submit Modal /bcsta1
    if (interaction.customId.startsWith('modal_bcsta1_')) {
      const targetChannelId = interaction.customId.replace('modal_bcsta1_', '');
      const tanggal = interaction.fields.getTextInputValue('bc_tanggal').trim();
      const jam = interaction.fields.getTextInputValue('bc_jam').trim();
      const agenda = interaction.fields.getTextInputValue('bc_agenda').trim();
      const catatan = interaction.fields.getTextInputValue('bc_catatan')?.trim() || '';
      const imageUrl = getAttachedOrLinkedPhoto(interaction, 'bc_foto');

      const hostId = interaction.user.id;
      const playerIds = [hostId];

      const embed = createMabarEmbed(hostId, playerIds, agenda, jam, tanggal, 'LOBBY MABAR: SURVIVE THE APOCALYPSE', 5, catatan, imageUrl);
      const row = createMabarButtons(false);

      const targetChannel = await interaction.guild.channels.fetch(targetChannelId).catch(() => null);
      if (!targetChannel) {
        return interaction.reply({
          content: '❌ Channel target tidak dapat diakses atau tidak ditemukan.',
          flags: MessageFlags.Ephemeral
        });
      }

      const staRoleTag = config.STA_ROLE_ID ? `<@&${config.STA_ROLE_ID}>` : '@here';

      const sentMsg = await targetChannel.send({
        content: `📢 **PENGUMUMAN JADWAL MABAR SURVIVE THE APOCALYPSE!**\nCc: ${staRoleTag}`,
        embeds: [embed],
        components: [row]
      });

      return interaction.reply({
        content: `✅ **Berhasil!** Jadwal mabar untuk **${tanggal}** (*${agenda}*) telah diposting ke <#${targetChannelId}>!\n🔗 [Klik di sini untuk melihat pesan](${sentMsg.url})`,
        flags: MessageFlags.Ephemeral
      });
    }

    return;
  }

  // C. Handle Button Interactions (Mabar & Roles)
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
    // FITUR: AUTO-LIST MABAR SQUAD (DINAMIS 2-10 ORANG)
    // ============================================
    if (customId === 'btn_mabar_join') {
      const embed = interaction.message.embeds[0];
      if (!embed || !embed.description) return;

      const judul = embed.title ? embed.title.replace(/^🎮\s*/, '') : 'LOBBY MABAR';
      const hostMatch = embed.description.match(/🔥 \*\*Host:\*\* <@!?(\d+)>/);
      const tanggalMatch = embed.description.match(/📅 \*\*Tanggal:\*\* ([^\n]+)/);
      const jamMatch = embed.description.match(/⏰ \*\*Waktu:\*\* ([^\n]+)/);
      const agendaMatch = embed.description.match(/🎯 \*\*Agenda:\*\* ([^\n]+)/);
      const kapMatch = embed.description.match(/👥 \*\*Kapasitas:\*\* \*\*\d+\/(\d+) Player\*\*/);
      const catatanMatch = embed.description.match(/📝 \*\*Catatan:\*\* ([^\n]+)/);

      const hostId = hostMatch ? hostMatch[1] : interaction.user.id;
      const tanggal = tanggalMatch ? tanggalMatch[1] : '';
      const jam = jamMatch ? jamMatch[1] : '';
      const agenda = agendaMatch ? agendaMatch[1] : 'Mabar';
      const maxSlots = kapMatch ? parseInt(kapMatch[1], 10) : 5;
      const catatan = catatanMatch ? catatanMatch[1] : '';

      const playerMatches = [...embed.description.matchAll(/Slot \d+:\*\* [^\n]*<@!?(\d+)>/g)];
      let playerIds = playerMatches.map(m => m[1]);

      // 1. Cek apakah sudah terdaftar
      if (playerIds.includes(interaction.user.id)) {
        return safeReply(interaction, '⚠️ Kamu sudah terdaftar di squad mabar ini!');
      }

      // 2. Cek apakah slot sudah penuh
      if (playerIds.length >= maxSlots) {
        return safeReply(interaction, `❌ Maaf, kuota squad sudah penuh (${maxSlots}/${maxSlots})!`);
      }

      const imageUrl = embed.image?.url || '';

      // Masukkan user baru ke slot
      playerIds.push(interaction.user.id);
      const isFull = playerIds.length >= maxSlots;

      const newEmbed = createMabarEmbed(hostId, playerIds, agenda, jam, tanggal, judul, maxSlots, catatan, imageUrl);
      const newRow = createMabarButtons(isFull);

      await interaction.update({ embeds: [newEmbed], components: [newRow] });

      // Jika pas penuh, beri notifikasi perayaan / instruksi voice channel
      if (isFull) {
        const voiceChannelId = config.STA_VOICE_ID || '1554714411548283050';
        await interaction.channel.send({
          content: `🎉🔥 **SQUAD "${judul.toUpperCase()}" LENGKAP (${maxSlots}/${maxSlots})!**\n` +
            `Daftar Player: ${playerIds.map(id => `<@${id}>`).join(', ')}\n` +
            `Yuk langsung merapat ke voice channel <#${voiceChannelId}> untuk mulai mabar!`
        });
      }
      return;
    }

    if (customId === 'btn_mabar_leave') {
      const embed = interaction.message.embeds[0];
      if (!embed || !embed.description) return;

      const judul = embed.title ? embed.title.replace(/^🎮\s*/, '') : 'LOBBY MABAR';
      const hostMatch = embed.description.match(/🔥 \*\*Host:\*\* <@!?(\d+)>/);
      const tanggalMatch = embed.description.match(/📅 \*\*Tanggal:\*\* ([^\n]+)/);
      const jamMatch = embed.description.match(/⏰ \*\*Waktu:\*\* ([^\n]+)/);
      const agendaMatch = embed.description.match(/🎯 \*\*Agenda:\*\* ([^\n]+)/);
      const kapMatch = embed.description.match(/👥 \*\*Kapasitas:\*\* \*\*\d+\/(\d+) Player\*\*/);
      const catatanMatch = embed.description.match(/📝 \*\*Catatan:\*\* ([^\n]+)/);

      const hostId = hostMatch ? hostMatch[1] : interaction.user.id;
      const tanggal = tanggalMatch ? tanggalMatch[1] : '';
      const jam = jamMatch ? jamMatch[1] : '';
      const agenda = agendaMatch ? agendaMatch[1] : 'Mabar';
      const maxSlots = kapMatch ? parseInt(kapMatch[1], 10) : 5;
      const catatan = catatanMatch ? catatanMatch[1] : '';

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

      const imageUrl = embed.image?.url || '';

      // Hapus player dari slot
      playerIds = playerIds.filter(id => id !== interaction.user.id);

      const newEmbed = createMabarEmbed(hostId, playerIds, agenda, jam, tanggal, judul, maxSlots, catatan, imageUrl);
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
