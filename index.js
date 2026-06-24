const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');
const https = require('https');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
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
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const CHANNEL_ID = process.env.CHANNEL_ID;
const ALLOWED_ROLE_ID = process.env.ALLOWED_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Keep-alive self-ping
client.once('ready', () => {
  const SELF_URL = process.env.RENDER_EXTERNAL_URL;
  if (SELF_URL) {
    setInterval(() => {
      https.get(SELF_URL, (res) => {
        console.log(`Keep-alive: ${res.statusCode}`);
      }).on('error', (err) => console.log(`Keep-alive error: ${err.message}`));
    }, 10 * 60 * 1000);
  }
});

// Message trap
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

    if (LOG_CHANNEL_ID) {
      try {
        const logChannel = await message.guild.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel) {
          await logChannel.send(
            `🚨 **${message.author.tag}** (ID: ${message.author.id}) đã bị kick vì chat vào khu vực cấm.`
          );
        }
      } catch (e) {
        console.log(`Lỗi gửi log: ${e.message}`);
      }
    }
  } catch (err) {
    console.log(`Lỗi khi thao tác với ${message.author.tag}: ${err.message}`);
  }
});

client.on('error', (err) => console.log(`Client error: ${err.message}`));
client.on('shardError', (err) => console.log(`Shard error: ${err.message}`));

// Connect to MongoDB and login
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Đã kết nối MongoDB thành công!');
    client.login(process.env.DISCORD_TOKEN);
  })
  .catch(err => {
    console.error('Lỗi kết nối MongoDB:', err);
    process.exit(1);
  });
