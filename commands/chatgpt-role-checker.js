const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-chatgpt-checker')
        .setDescription('Setup a channel for ChatGPT role checking')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to monitor for messages')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to assign')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    execute: async (interaction, context) => {
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        
        // Save the configuration to the main context
        context.chatGptChecker = {
            channelId: channel.id,
            roleId: role.id,
            isActive: true
        };
        
        await interaction.reply({
            content: `✅ ChatGPT role checker has been set up for channel ${channel} with role ${role}!`,
            ephemeral: true
        });
        
        return context.chatGptChecker;
    }
};