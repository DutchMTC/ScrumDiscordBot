const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-smoking-checker')
        .setDescription('Setup smoking detection across all channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    execute: async (interaction, context) => {
        // Save the configuration to the ChatGPT integration
        if (context.chatGptChecker) {
            context.chatGptChecker.updateSmokingConfig({
                isActive: true
            });
            
            await interaction.reply({
                content: `✅ ChatGPT smoking detection has been enabled across all channels! I'll respond with a silly message when someone talks about smoking.`,
                ephemeral: true
            });
            
            return {
                isActive: true
            };
        } else {
            await interaction.reply({
                content: `❌ ChatGPT integration is not available!`,
                ephemeral: true
            });
            
            return null;
        }
    }
};