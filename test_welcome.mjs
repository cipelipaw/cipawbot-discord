import { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  AttachmentBuilder 
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
  ]
});

client.once('ready', async () => {
  console.log(`Bot Cipaw online sebagai: ${client.user.tag}`);
  const channel = await client.channels.fetch(config.WELCOME_CHANNEL_ID);

  if (!channel) {
    console.error('Channel welcome tidak ditemukan!');
    process.exit(1);
  }

  console.log('Mengirim simulasi pesan selamat datang...');
  const welcomeFile = new AttachmentBuilder('welcome_banner.jpg');
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('✨ MEMBER BARU TELAH BERGABUNG! ✨')
    .setDescription(
      `Haii! 👋 Senang banget kamu akhirnya mampir dan bergabung di sini.\n` +
      `Jangan malu-malu buat ngobrol, kenalan, atau ikut seru-seruan bareng yang lain yaa!`
    )
    .setImage('attachment://welcome_banner.jpg')
    .setColor('#57F287')
    .setTimestamp();

  await channel.send({
    content: `🎉 Selamat datang di server, **@MemberBaru**!`,
    files: [welcomeFile],
    embeds: [welcomeEmbed]
  });

  console.log('Mengirim simulasi pesan perpisahan (goodbye)...');
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
    files: [goodbyeFile],
    embeds: [goodbyeEmbed]
  });

  console.log('Simulasi selesai dikirim ke Discord!');
  client.destroy();
  process.exit(0);
});

client.login(env.BOT_TOKEN);
