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
  res.end('Bot dang chay');
}).listen(PORT, () => console.log('Server dang chay tren port ' + PORT));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

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
        console.log('Keep-alive: ' + res.statusCode);
      }).on('error', (err) => console.log('Keep-alive error: ' + err.message));
    }, 10 * 60 * 1000);
  }
});

// Ping command
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    await message.reply('Pong! Bot dang hoat dong');
  }
});

client.on('error', (err) => console.log('Client error: ' + err.message));
client.on('shardError', (err) => console.log('Shard error: ' + err.message));

// Connect to MongoDB and login
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Da ket noi MongoDB thanh cong!');
    client.login(process.env.DISCORD_TOKEN);
  })
  .catch(err => {
    console.error('Loi ket noi MongoDB:', err);
    process.exit(1);
  });