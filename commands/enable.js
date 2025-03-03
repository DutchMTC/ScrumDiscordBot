const { ApplicationCommandType } = require('discord.js');

module.exports = {
    data: {
        name: 'enable',
        description: 'Enable scheduled messages'
    },
    async execute(interaction) {
        await interaction.reply({
            content: 'Scheduled messages enabled',
            ephemeral: true
        });
        return null;
    }
};