const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: {
        name: 'reset-tracker',
        description: 'Reset the message tracking for today\'s thread',
        defaultMemberPermissions: PermissionFlagsBits.Administrator.toString()
    },
    async execute(interaction, { resetMessageTracker, currentThreadId }) {
        if (!currentThreadId) {
            await interaction.reply({
                content: 'No active thread found. Please create one first using the send-update command.',
                ephemeral: true
            });
            return;
        }

        resetMessageTracker();
        await interaction.reply({
            content: 'Message tracking has been reset. All members will need to send a new message in the current thread.',
            ephemeral: true
        });
    }
};