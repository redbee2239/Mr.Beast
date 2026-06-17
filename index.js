const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const ALLOWED_ROLE_ID = process.env.ALLOWED_ROLE_ID;

client.once('ready', () => {
  console.log(`Bot đã đăng nhập với tên: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    await message.reply('Pong! Bot đang hoạt động ✅');
    return;
  }

  if (message.channel.id !== CHANNEL_ID) return;

  if (ALLOWED_ROLE_ID && message.member.roles.cache.has(ALLOWED_ROLE_ID)) return;

  console.log(`User roles: ${message.member.roles.cache.map(r => r.id).join(', ')}`);
  console.log(`Allowed role: ${ALLOWED_ROLE_ID}`);

  try {
    await message.delete();
    await message.member.kick('Đã gửi tin nhắn trong khu vực bị cấm');
    console.log(`Đã kick ${message.author.tag} (ID: ${message.author.id})`);
  } catch (err) {
    console.log(`Lỗi khi thao tác với ${message.author.tag}: ${err.message}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
