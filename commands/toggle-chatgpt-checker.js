const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle-chatgpt-checker')
        .setDescription('Enable or disable the ChatGPT role checker')
        .addBooleanOption(option =>
            option.setName('active')
                .setDescription('Enable or disable the feature')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    execute: async (interaction, context) => {
        const isActive = interaction.options.getBoolean('active');
        
        if (!context.chatGptChecker) {
            await interaction.reply({
                content: '❌ ChatGPT role checker has not been initialized yet.',
                ephemeral: true
            });
            return;
        }

        // Update the active status
        context.chatGptChecker.updateConfig({
            isActive: isActive
        });
        
        await interaction.reply({
            content: `✅ ChatGPT role checker has been ${isActive ? 'enabled' : 'disabled'}.`,
            ephemeral: true
        });
        
        return { isActive };
    }
};