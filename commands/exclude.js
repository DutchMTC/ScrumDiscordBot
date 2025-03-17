const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const excludedUsersPath = path.join(__dirname, '..', 'config', 'excludedUsers.json');

// Helper functions
function loadExcludedUsers() {
    try {
        const data = fs.readFileSync(excludedUsersPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading excluded users:', error);
        return { excludedUsers: [] };
    }
}

function saveExcludedUsers(excludedUsers) {
    try {
        // Create the config directory if it doesn't exist
        const configDir = path.dirname(excludedUsersPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Write the file
        fs.writeFileSync(excludedUsersPath, JSON.stringify(excludedUsers, null, 4));
    } catch (error) {
        console.error('Error saving excluded users:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('exclude')
        .setDescription('Exclude or include a user from stand-downs')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Exclude a user from stand-downs')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to exclude')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Include a previously excluded user in stand-downs')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to include')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all excluded users')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const config = loadExcludedUsers();
        
        if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
            if (!config.excludedUsers.includes(user.id)) {
                config.excludedUsers.push(user.id);
                saveExcludedUsers(config);
                await interaction.reply(`${user.username} has been excluded from stand-downs.`);
            } else {
                await interaction.reply(`${user.username} is already excluded from stand-downs.`);
            }
        } else if (subcommand === 'remove') {
            const user = interaction.options.getUser('user');
            const index = config.excludedUsers.indexOf(user.id);
            if (index > -1) {
                config.excludedUsers.splice(index, 1);
                saveExcludedUsers(config);
                await interaction.reply(`${user.username} has been included in stand-downs.`);
            } else {
                await interaction.reply(`${user.username} is not excluded from stand-downs.`);
            }
        } else if (subcommand === 'list') {
            if (config.excludedUsers.length === 0) {
                await interaction.reply('No users are currently excluded from stand-downs.');
            } else {
                const excludedUsersList = await Promise.all(
                    config.excludedUsers.map(async userId => {
                        try {
                            const user = await interaction.client.users.fetch(userId);
                            return `- ${user.username}`;
                        } catch (error) {
                            return `- Unknown user (${userId})`;
                        }
                    })
                );
                await interaction.reply(`**Excluded users:**\n${excludedUsersList.join('\n')}`);
            }
        }
    },
};
