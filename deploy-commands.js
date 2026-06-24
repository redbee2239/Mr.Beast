const { REST, Routes } = require('discord.js');
const giveawayCommand = require('./commands/giveaway');
require('dotenv').config();

const commands = [giveawayCommand.data.toJSON()];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Đang xóa command cũ...');
    const existing = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
    for (const cmd of existing) {
      await rest.delete(Routes.applicationCommand(process.env.CLIENT_ID, cmd.id));
      console.log(`Đã xóa: ${cmd.name}`);
    }

    console.log('Đang đăng ký slash commands mới...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Đã đăng ký slash commands thành công!');
  } catch (error) {
    console.error('Lỗi:', error);
  }
})();
