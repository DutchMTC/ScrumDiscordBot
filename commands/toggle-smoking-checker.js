const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle-smoking-checker')
        .setDescription('Enable or disable smoking detection across all channels')
        .addBooleanOption(option =>
            option.setName('active')
                .setDescription('Enable or disable the feature')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    execute: async (interaction, context) => {
        const isActive = interaction.options.getBoolean('active');
        
        if (!context.chatGptChecker) {
            await interaction.reply({
                content: '❌ ChatGPT integration has not been initialized yet.',
                ephemeral: true
            });
            return;
        }

        // Update just the active status for smoking detection
        context.chatGptChecker.updateSmokingConfig({
            isActive: isActive
        });
        
        await interaction.reply({
            content: `✅ Smoking detection has been ${isActive ? 'enabled' : 'disabled'} across all channels. I'll now ${isActive ? 'respond with a silly message when someone talks about smoking' : 'stop responding to smoking mentions'}.`,
            ephemeral: true
        });
        
        return { isActive };
    }
};