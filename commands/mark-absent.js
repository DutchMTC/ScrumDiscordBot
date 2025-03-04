const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mark-absent')
        .setDescription('Mark a user as absent for the day')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mark as absent')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    execute: async (interaction, context) => {
        // Get the mentioned user from the command options
        const targetUser = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(targetUser.id);
        
        // Get the absence role ID from config or use the provided constant
        const absenceRoleId = context.chatGptChecker?.absenceConfig?.roleId || '1346230983296548967';
        
        try {
            // Assign the absence role to the user
            await member.roles.add(absenceRoleId);
            
            await interaction.reply({
                content: `✅ ${targetUser} has been marked as absent for the day.`,
                ephemeral: true
            });
        } catch (error) {
            console.error(`Error assigning absence role:`, error);
            await interaction.reply({
                content: `⚠️ There was an error marking ${targetUser} as absent. Please check my permissions.`,
                ephemeral: true
            });
        }
    }
};