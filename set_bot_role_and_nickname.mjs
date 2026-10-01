import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';

const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=').trim();
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.on('clientReady', async () => {
  const guild = await client.guilds.fetch(env.GUILD_ID);
  const botMember = await guild.members.fetch(client.user.id);

  // 1. Buat atau cari role '🤖︱BOT' dengan hoist: true agar terpisah rapi di sidebar member
  let botRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('bot') && r.name !== 'Cipaw');
  if (!botRole) {
    botRole = await guild.roles.create({
      name: '🤖︱BOT',
      color: '#5865F2',
      hoist: true,
      reason: 'Role khusus untuk bot server agar tampil terpisah',
    });
    console.log('Role 🤖︱BOT berhasil dibuat!');
  }

  // Berikan role 🤖︱BOT ke bot Cipaw
  await botMember.roles.add(botRole);
  console.log('Role 🤖︱BOT berhasil diberikan ke Cipaw!');

  // 2. Set Nickname bot di server menjadi 'Cipaw BOT'
  try {
    await botMember.setNickname('Cipaw BOT');
    console.log('Nickname server bot diubah menjadi "Cipaw BOT"!');
  } catch (err) {
    console.warn('Gagal mengubah nickname:', err.message);
  }

  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
