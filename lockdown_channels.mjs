import fs from 'fs';
import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';

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
  ]
});

client.on('clientReady', async () => {
  console.log(`Log in sebagai: ${client.user.tag}`);
  const guild = await client.guilds.fetch(env.GUILD_ID);

  const everyoneRole = guild.roles.everyone;
  const memberRole = guild.roles.cache.find(r => r.name.includes('Member'));
  const staRole = guild.roles.cache.find(r => r.name.includes('Survive The Apocalypse'));
  const founderRole = guild.roles.cache.find(r => r.name.includes('Founder'));
  const adminRole = guild.roles.cache.find(r => r.name.includes('Admin'));

  const channels = await guild.channels.fetch();

  console.log('Mengunci semua channel untuk @everyone...');

  for (const [id, ch] of channels) {
    if (!ch) continue;

    // Rules Channel: Satu-satunya channel yang boleh dilihat @everyone
    if (ch.name.includes('rules')) {
      await ch.permissionOverwrites.set([
        {
          id: everyoneRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions],
        },
      ]);
      console.log(`[TERBUKA] ${ch.name} (Bisa dilihat semua orang untuk baca & klik verifikasi)`);
      continue;
    }

    // Staff Channels / Category
    if (ch.name.includes('STAFF') || ch.parent?.name.includes('STAFF')) {
      await ch.permissionOverwrites.set([
        {
          id: everyoneRole.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: adminRole?.id || everyoneRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: founderRole?.id || everyoneRole.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ]);
      console.log(`[STAFF ONLY] ${ch.name}`);
      continue;
    }

    // Khusus Channel Survive The Apocalypse:
    // @everyone: TIDAK BISA LIHAT
    // Member: BISA LIHAT, TAPI TIDAK BISA CHAT
    // Role STA: BISA LIHAT & BISA CHAT
    if (ch.name.includes('survive-the-apocalypse')) {
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
        {
          id: staRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel, 
            PermissionsBitField.Flags.SendMessages, 
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles
          ],
        },
      ]);
      console.log(`[STA KHUSUS] ${ch.name} terkunci chat-nya untuk yang belum punya role STA!`);
      continue;
    }

    // Voice Channels
    if (ch.type === 2) {
      await ch.permissionOverwrites.set([
        {
          id: everyoneRole.id,
          deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
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
      console.log(`[TERKUNCI VOICE] ${ch.name} terkunci untuk non-member!`);
      continue;
    }

    // Text Channels & Categories umum (Community, Gaming Zone, Information sub-channels)
    await ch.permissionOverwrites.set([
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
    console.log(`[TERKUNCI TEXT/CAT] ${ch.name} terkunci untuk non-member!`);
  }

  // Verifikasi kembali kudaponi
  const kudaponi = await guild.members.fetch('758755538041045022');
  console.log('\n--- HASIL PENGETESAN AKUN KUDAPONI ---');
  for (const [id, ch] of channels) {
    if (ch.type === 4) continue;
    const canView = ch.permissionsFor(kudaponi).has('ViewChannel');
    if (canView) {
      console.log(`[TERLIHAT OLEH KUDAPONI]: ${ch.name}`);
    }
  }

  console.log('Semua channel berhasil disinkronisasi & dikunci dengan sempurna!');
  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
