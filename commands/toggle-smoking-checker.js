const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle-smoking-checker')
        .setDescription('Enable or disable smoking detection for the configured channel')
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

        // Check if a channel has been configured
        if (!context.chatGptChecker.smokingConfig.channelId && isActive) {
            await interaction.reply({
                content: '⚠️ No channel has been configured for smoking detection. Please use `/setup-smoking-checker` first to configure a channel.',
                ephemeral: true
            });
            return;
        }

        // Update just the active status for smoking detection
        context.chatGptChecker.updateSmokingConfig({
            isActive: isActive
        });
        
        // Get the channel name for better feedback
        let channelMention = "the configured channel";
        if (context.chatGptChecker.smokingConfig.channelId) {
            try {
                const channel = await interaction.guild.channels.fetch(context.chatGptChecker.smokingConfig.channelId);
                if (channel) {
                    channelMention = `<#${channel.id}>`;
                }
            } catch (error) {
                console.error("Error fetching channel:", error);
            }
        }
        
        await interaction.reply({
            content: `✅ Smoking detection has been ${isActive ? 'enabled' : 'disabled'} for ${channelMention}. I'll ${isActive ? 'now respond with a silly message when someone talks about smoking' : 'stop responding to smoking mentions'}.`,
            ephemeral: true
        });
        
        return { isActive };
    }
};