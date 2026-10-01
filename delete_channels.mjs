import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';

const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=').trim();
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('clientReady', async () => {
  const guild = await client.guilds.fetch(env.GUILD_ID);
  const channels = await guild.channels.fetch();

  for (const [id, ch] of channels) {
    if (!ch) continue;
    if (ch.name.includes('saran') || ch.name.includes('feedback') || ch.name.includes('clip-highlights') || ch.name.includes('clip')) {
      await ch.delete();
      console.log(`Channel dihapus: ${ch.name}`);
    }
  }

  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
