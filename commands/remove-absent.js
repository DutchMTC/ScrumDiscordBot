const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-absent')
        .setDescription('Remove the absent status from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mark as no longer absent')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    execute: async (interaction, context) => {
        // Get the mentioned user from the command options
        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id);
        
        // Get the absence role ID from config or use the provided constant
        const absenceRoleId = context.chatGptChecker?.absenceConfig?.roleId || '1346230983296548967';
        
        try {
            // Check if the user has the absence role
            if (!member.roles.cache.has(absenceRoleId)) {
                await interaction.reply({
                    content: `${targetUser} is not marked as absent.`,
                    ephemeral: true
                });
                return;
            }
            
            // Remove the absence role from the user
            await member.roles.remove(absenceRoleId);
            
            await interaction.reply({
                content: `✅ ${targetUser} is no longer marked as absent.`,
                ephemeral: true
            });
        } catch (error) {
            console.error(`Error removing absence role:`, error);
            await interaction.reply({
                content: `⚠️ There was an error updating ${targetUser}'s status. Please check my permissions.`,
                ephemeral: true
            });
        }
    }
};