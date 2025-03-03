const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: {
        name: 'test-reminder',
        description: 'Test the reminder system by sending a reminder message now',
        defaultMemberPermissions: PermissionFlagsBits.Administrator.toString()
    },
    async execute(interaction, { sendReminders, currentThreadId }) {
        await interaction.deferReply({ ephemeral: true });
        
        if (!currentThreadId) {
            await interaction.editReply({
                content: 'No active thread found for today. Please create one first using the send-update command.',
                ephemeral: true
            });
            return;
        }

        await sendReminders();
        await interaction.editReply({
            content: 'Reminder test executed successfully!',
            ephemeral: true
        });
    }
};