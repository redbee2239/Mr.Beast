const { Events, REST, Routes, EmbedBuilder } = require('discord.js');
const giveawayCommand = require('../commands/giveaway');
const Giveaway = require('../models/Giveaway');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot đã đăng nhập với tên: ${client.user.tag}`);

    const commands = [giveawayCommand.data.toJSON()];
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      const existing = await rest.get(Routes.applicationCommands(client.user.id));
      const hasGiveaway = existing.some(cmd => cmd.name === 'giveaway');

      if (!hasGiveaway) {
        console.log('Đang đăng ký commands...');
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: commands }
        );
        console.log('Đã đăng ký commands thành công!');
      } else {
        console.log('Commands đã tồn tại, bỏ qua.');
      }
    } catch (error) {
      console.error('Lỗi đăng ký commands:', error);
    }

    // Load active giveaways and set timers
    const activeGiveaways = await Giveaway.find({ ended: false });
    console.log(`Đang tải ${activeGiveaways.length} giveaway đang hoạt động...`);

    for (const giveaway of activeGiveaways) {
      const remaining = giveaway.endTime.getTime() - Date.now();

      if (remaining <= 0) {
        const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) continue;
        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (!message) continue;
        await endGiveaway(giveaway, message);
      } else if (!giveaway.paused) {
        setTimeout(async () => {
          const updated = await Giveaway.findOne({ messageId: giveaway.messageId, ended: false });
          if (!updated || updated.ended) return;
          const channel = await client.channels.fetch(updated.channelId).catch(() => null);
          if (!channel) return;
          const message = await channel.messages.fetch(updated.messageId).catch(() => null);
          if (!message) return;
          await endGiveaway(updated, message);
        }, remaining);
      }
    }
  },
};

async function endGiveaway(giveaway, message) {
  giveaway.ended = true;

  if (giveaway.participants.length === 0) {
    giveaway.winners = [];
    await giveaway.save();

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY KẾT THÚC 🎉')
      .setDescription(`**Phần thưởng:** ${giveaway.prize}\n\nKhông có ai tham gia!`)
      .setColor(0xed4245)
      .setTimestamp();

    await message.edit({ embeds: [embed] });
    return;
  }

  const shuffled = [...giveaway.participants].sort(() => 0.5 - Math.random());
  const selectedWinners = shuffled.slice(0, giveaway.winnersCount);
  giveaway.winners = selectedWinners;
  await giveaway.save();

  const winnerMentions = selectedWinners.map(id => `<@${id}>`).join(', ');
  const embed = new EmbedBuilder()
    .setTitle('🎉 GIVEAWAY KẾT THÚC 🎉')
    .setDescription(`**Phần thưởng:** ${giveaway.prize}\n\n**Người thắng:** ${winnerMentions}`)
    .setColor(0x57f287)
    .setTimestamp();

  await message.edit({ embeds: [embed] });
  await message.reply(`Chúc mừng ${winnerMentions}! Bạn đã thắng **${giveaway.prize}**! 🎉`);
}
