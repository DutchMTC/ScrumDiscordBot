const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-smoking-checker')
        .setDescription('Setup smoking detection for specific channels')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to monitor for smoking messages')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    execute: async (interaction, context) => {
        const channel = interaction.options.getChannel('channel');
        
        // Save the configuration to the ChatGPT integration
        if (context.chatGptChecker) {
            context.chatGptChecker.updateSmokingConfig({
                channelId: channel.id,
                isActive: true
            });
            
            await interaction.reply({
                content: `✅ ChatGPT smoking detection has been enabled for channel ${channel}! I'll respond with a silly message when someone talks about smoking in that channel.`,
                ephemeral: true
            });
            
            return {
                channelId: channel.id,
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