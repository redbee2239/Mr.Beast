const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot đang chạy');
}).listen(PORT, () => console.log(`Server đang chạy trên port ${PORT}`));

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

  const SELF_URL = process.env.RENDER_EXTERNAL_URL;
  if (SELF_URL) {
    setInterval(() => {
      http.get(SELF_URL, (res) => {
        console.log(`Keep-alive: ${res.statusCode}`);
      }).on('error', (err) => console.log(`Keep-alive error: ${err.message}`));
    }, 10 * 60 * 1000);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    await message.reply('Pong! Bot đang hoạt động ✅');
    return;
  }

  if (message.channel.id !== CHANNEL_ID) return;

  if (ALLOWED_ROLE_ID && message.member.roles.cache.has(ALLOWED_ROLE_ID)) return;

  try {
    await message.delete();

    const invite = await message.guild.invites.create(message.channel.id, {
      maxAge: 86400,
      reason: 'Link invite cho người bị kick',
    });

    try {
      await message.member.send(
        `Bạn đã bị kick do chat vào khu vực cấm.\nVào lại server bằng link sau:\n${invite.url}`
      );
    } catch {
      console.log(`Không thể gửi DM cho ${message.author.tag}`);
    }

    await message.member.kick('Đã gửi tin nhắn trong khu vực bị cấm');
    console.log(`Đã kick ${message.author.tag} (ID: ${message.author.id})`);
  } catch (err) {
    console.log(`Lỗi khi thao tác với ${message.author.tag}: ${err.message}`);
  }
});

client.on('error', (err) => console.log(`Client error: ${err.message}`));
client.on('shardError', (err) => console.log(`Shard error: ${err.message}`));

client.login(process.env.DISCORD_TOKEN);
