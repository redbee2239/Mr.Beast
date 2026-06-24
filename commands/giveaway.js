const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Tạo giveaway mới')
    .setDefaultMemberPermissions(0x20) // ADMINISTRATOR
    .addStringOption(opt =>
      opt.setName('prize').setDescription('Phần thưởng').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('winners').setDescription('Số người thắng').setRequired(true).setMinValue(1)
    )
    .addIntegerOption(opt =>
      opt.setName('duration').setDescription('Thời gian (phút)').setRequired(true).setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('description').setDescription('Mô tả thêm').setRequired(false)
    ),

  async execute(interaction) {
    const prize = interaction.options.getString('prize');
    const winnersCount = interaction.options.getInteger('winners');
    const duration = interaction.options.getInteger('duration');
    const description = interaction.options.getString('description') || '';
    const endTime = new Date(Date.now() + duration * 60 * 1000);

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(`**Phần thưởng:** ${prize}\n${description ? `**Mô tả:** ${description}\n` : ''}**Số người thắng:** ${winnersCount}\n**Kết thúc:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n\nReact với 🎉 để tham gia!`)
      .setColor(0x5865f2)
      .setFooter({ text: `Tạo bởi ${interaction.user.tag}` })
      .setTimestamp();

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });
    await message.react('🎉');

    await Giveaway.create({
      messageId: message.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
      hostId: interaction.user.id,
      prize,
      description,
      winnersCount,
      endTime,
    });

    setTimeout(async () => {
      const giveaway = await Giveaway.findOne({ messageId: message.id, ended: false });
      if (!giveaway) return;

      giveaway.ended = true;

      if (giveaway.participants.length === 0) {
        giveaway.winners = [];
        await giveaway.save();

        const noWinnerEmbed = new EmbedBuilder()
          .setTitle('🎉 GIVEAWAY KẾT THÚC 🎉')
          .setDescription(`**Phần thưởng:** ${prize}\n\nKhông có ai tham gia!`)
          .setColor(0xed4245)
          .setTimestamp();

        await message.edit({ embeds: [noWinnerEmbed] });
        return;
      }

      const shuffled = [...giveaway.participants].sort(() => 0.5 - Math.random());
      const selectedWinners = shuffled.slice(0, winnersCount);
      giveaway.winners = selectedWinners;
      await giveaway.save();

      const winnerMentions = selectedWinners.map(id => `<@${id}>`).join(', ');
      const endedEmbed = new EmbedBuilder()
        .setTitle('🎉 GIVEAWAY KẾT THÚC 🎉')
        .setDescription(`**Phần thưởng:** ${prize}\n\n**Người thắng:** ${winnerMentions}`)
        .setColor(0x57f287)
        .setTimestamp();

      await message.edit({ embeds: [endedEmbed] });
      await message.reply(`Chúc mừng ${winnerMentions}! Bạn đã thắng **${prize}**! 🎉`);
    }, duration * 60 * 1000);
  },
};
