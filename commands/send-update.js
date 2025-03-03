const { ApplicationCommandType } = require('discord.js');

module.exports = {
    data: {
        name: 'send-update',
        description: 'Send the daily update message immediately'
    },
    async execute(interaction, { sendDailyEmbed }) {
        await interaction.deferReply({ ephemeral: true }); // Changed to use ephemeral property
        await sendDailyEmbed();
        await interaction.editReply({ 
            content: 'Update message sent successfully!'
            // No need to specify ephemeral again for editReply
        });
    }
};