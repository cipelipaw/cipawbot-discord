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
  const kudaponi = await guild.members.fetch('758755538041045022');
  console.log('kudaponi roles:', kudaponi.roles.cache.map(r => r.name));
  
  const channels = await guild.channels.fetch();
  for (const [id, ch] of channels) {
    if (ch.type === 4) continue; // skip category
    const perms = ch.permissionsFor(kudaponi);
    const canView = perms.has('ViewChannel');
    console.log(`Channel: ${ch.name} (Parent: ${ch.parent?.name}) => Can view? ${canView}`);
    if (canView && ch.name !== '📜︱rules') {
      console.log('Overwrites for', ch.name, ':');
      ch.permissionOverwrites.cache.forEach(po => {
        console.log(`  Target ID: ${po.id} (Type: ${po.type}) Allow: ${po.allow.toArray().join(', ')} | Deny: ${po.deny.toArray().join(', ')}`);
      });
    }
  }
  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
