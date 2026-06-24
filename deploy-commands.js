const { REST, Routes } = require('discord.js');
const giveawayCommand = require('./commands/giveaway');
require('dotenv').config();

const commands = [giveawayCommand.data.toJSON()];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Đang đăng ký slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Đã đăng ký slash commands thành công!');
  } catch (error) {
    console.error('Lỗi đăng ký slash commands:', error);
  }
})();
