import fs from 'fs';

// Read .env
const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=');
}

const token = env.BOT_TOKEN;
const guildId = env.GUILD_ID;

const headers = {
  Authorization: `Bot ${token}`,
  'Content-Type': 'application/json',
};

async function test() {
  console.log('Testing bot connection to Discord API...');
  
  // 1. Get Current Bot User
  const userRes = await fetch('https://discord.com/api/v10/users/@me', { headers });
  if (!userRes.ok) {
    console.error('Failed to get bot user:', userRes.status, await userRes.text());
    return;
  }
  const botUser = await userRes.json();
  console.log(`Bot connected as: ${botUser.username}#${botUser.discriminator} (ID: ${botUser.id})`);

  // 2. Get Guild Details
  const guildRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers });
  if (!guildRes.ok) {
    console.error('Failed to access server:', guildRes.status, await guildRes.text());
    console.log('Catatan: Pastikan bot sudah diundang ke server dengan link invite!');
    return;
  }
  const guild = await guildRes.json();
  console.log(`Server ditemukan: "${guild.name}" (ID: ${guild.id})`);

  // 3. Get Channels
  const chRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, { headers });
  const channels = await chRes.json();
  console.log(`Jumlah channel saat ini: ${channels.length}`);
  for (const ch of channels) {
    const typeStr = ch.type === 4 ? '[Kategori]' : ch.type === 2 ? '[Voice]' : '[Text]';
    console.log(`  - ${typeStr} ${ch.name} (ID: ${ch.id})`);
  }

  // 4. Get Roles
  const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers });
  const roles = await rolesRes.json();
  console.log(`Jumlah role saat ini: ${roles.length}`);
  for (const r of roles) {
    console.log(`  - Role: ${r.name} (ID: ${r.id})`);
  }

  console.log('\n STATUS: SUKSES TERHUBUNG & BOT SIAP BEKERJA!');
}

test().catch(console.error);
