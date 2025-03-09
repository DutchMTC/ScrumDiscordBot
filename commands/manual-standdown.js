const { ApplicationCommandType } = require('discord.js');

module.exports = {
    data: {
        name: 'manual-standdown',
        description: 'Send the daily stand-down message immediately'
    },
    async execute(interaction, { sendDailyEmbed }) {
        await interaction.deferReply({ ephemeral: true }); 
        await sendDailyEmbed();
        await interaction.editReply({ 
            content: 'Stand-down message sent successfully!'
        });
    }
};