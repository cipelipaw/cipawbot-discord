import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';

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
  const guild = await client.guilds.fetch(env.GUILD_ID);
  const members = await guild.members.fetch();
  console.log(`Total members: ${members.size}`);
  for (const [id, m] of members) {
    const roleNames = m.roles.cache.map(r => r.name).filter(n => n !== '@everyone');
    console.log(`User: ${m.user.username} (ID: ${m.id}, Bot: ${m.user.bot}) => Roles: [${roleNames.join(', ')}]`);
  }
  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
