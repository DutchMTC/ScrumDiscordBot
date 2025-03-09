const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-standdown-time')
        .setDescription('Edit the time for daily stand-down messages')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('New time in 24-hour format (e.g., 15:30)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    execute: async (interaction, context) => {
        // Get the time option from the command
        const timeInput = interaction.options.getString('time');
        
        // Validate the time format (HH:MM 24-hour format)
        const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(timeInput)) {
            await interaction.reply({
                content: '⚠️ Invalid time format! Please use 24-hour format (e.g., 15:30).',
                ephemeral: true
            });
            return;
        }
        
        // Parse the time
        const [hours, minutes] = timeInput.split(':').map(Number);
        
        try {
            // Cancel existing scheduled tasks
            if (context.scheduledTask) {
                context.scheduledTask.stop();
            }
            
            // Create new cron schedule
            const cron = require('node-cron');
            context.scheduledTask = cron.schedule(`${minutes} ${hours} * * 1-5`, async () => {
                await context.sendDailyEmbed();
                context.resetMessageTracker();
            }, {
                timezone: "Europe/Amsterdam"
            });
            
            await interaction.reply({
                content: `✅ Stand-down time updated to ${timeInput} (Amsterdam time). The next stand-down message will be sent at this time.`,
                ephemeral: true
            });
            
            return { hours, minutes };
        } catch (error) {
            console.error('Error updating stand-down time:', error);
            await interaction.reply({
                content: '⚠️ There was an error updating the stand-down time.',
                ephemeral: true
            });
        }
    }
};