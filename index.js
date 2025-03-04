require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const ChatGptIntegration = require('./chatgpt-integration');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

let disabledUntil = null;
let scheduledTask = null;
let reminderTask = null;
let messageTracker = new Map(); // Tracks who has sent messages for the day
let currentThreadId = null; // Tracks the current day's thread
let chatGptChecker = null; // Will hold our ChatGPT integration instance

// Function to reset the message tracker
function resetMessageTracker() {
    messageTracker.clear(); // Only clear the message tracking, keep the thread ID
}

// Function to create a new thread for the day
async function createDailyThread(channel) {
    const date = new Date().toLocaleDateString('en-NL', { 
        timeZone: 'Europe/Amsterdam',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const thread = await channel.threads.create({
        name: `Daily Stand-down (${date})`,
        autoArchiveDuration: 1440, // Archive after 24 hours
        reason: 'Daily stand-down thread'
    });

    currentThreadId = thread.id; // Set the current thread ID

    // Get all guild members and mention them
    const guild = channel.guild;
    const members = await guild.members.fetch();
    
    // Get the absence role ID from config or use the constant
    const absenceRoleId = chatGptChecker?.absenceConfig?.roleId || '1346230983296548967';
    
    // Filter out bots and members who have the absence role
    const activeMembers = members.filter(member => 
        !member.user.bot && 
        !member.roles.cache.has(absenceRoleId)
    );
    
    const mentions = activeMembers.map(member => `<@${member.id}>`).join(' ');

    // Create and send the embed in the thread
    const embed = new EmbedBuilder()
        .setTitle('It\'s stand-down time!')
        .setDescription('Please do your stand-downs before the end of the day!')
        .setImage('https://media1.tenor.com/m/jT_iSTEezBAAAAAd/catjam.gif')
        .setColor('#ff00d1')
        .setFooter({ text: new Date().toLocaleDateString('en-NL', { 
            timeZone: 'Europe/Amsterdam',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })});

    // Send embed and welcome message in thread
    await thread.send(
        `${mentions}`
    );
    await thread.send({ embeds: [embed] });

    return thread;
}

// Function to create and send the embed
async function sendDailyEmbed() {
    if (disabledUntil && Date.now() < disabledUntil) {
        console.log('Scheduled message is currently disabled');
        return;
    }

    const channel = await client.channels.fetch(process.env.EMBED_CHANNEL_ID);
    if (!channel) return;
    
    // Create new thread for today and send the embed there
    await createDailyThread(channel);
}

// Function to send reminders
async function sendReminders() {
    if (!currentThreadId) return;

    const channel = await client.channels.fetch(process.env.EMBED_CHANNEL_ID);
    if (!channel) return;

    const thread = await channel.threads.fetch(currentThreadId);
    if (!thread) return;

    const guild = channel.guild;
    const members = await guild.members.fetch();
    
    // Get the absence role ID from config or use the constant
    const absenceRoleId = chatGptChecker?.absenceConfig?.roleId || '1346230983296548967';
    
    const missingMessages = members.filter(member => 
        !member.user.bot && // Not a bot
        !messageTracker.has(member.id) && // Hasn't sent a message
        !member.roles.cache.has(absenceRoleId) // Not marked as absent
    );

    if (missingMessages.size > 0) {
        const mentions = missingMessages.map(member => `<@${member.id}>`).join(' ');
        await thread.send(
            `❗ ${mentions} ❗` +
            `❗ Please don't forget to do your stand-downs before the end of the day! ❗`
        );
    }
}

// Start the scheduled task
function startScheduledTask() {
    // Reset tracker at midnight
    cron.schedule('0 0 * * *', resetMessageTracker, {
        timezone: "Europe/Amsterdam"
    });

    // Original daily update at 3:45 PM
    scheduledTask = cron.schedule('45 15 * * 1-5', async () => {
        await sendDailyEmbed();
        resetMessageTracker(); // Reset tracker when daily message is sent
    }, {
        timezone: "Europe/Amsterdam"
    });

    // Reminder at 8 PM
    reminderTask = cron.schedule('0 20 * * 1-5', sendReminders, {
        timezone: "Europe/Amsterdam"
    });
}

// Load commands
const commands = new Map();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    commands.set(command.data.name, command);
}

// Register slash commands
async function registerCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        console.log('Started refreshing application (/) commands.');

        const commandData = Array.from(commands.values()).map(cmd => cmd.data);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandData }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Initialize ChatGPT integration
    chatGptChecker = new ChatGptIntegration(client);
    
    await registerCommands();
    startScheduledTask();
});

// Track messages
client.on('messageCreate', async message => {
    // Only track messages from non-bots in the current day's thread
    if (!message.author.bot && 
        message.channel.isThread() && 
        message.channel.id === currentThreadId) {
        messageTracker.set(message.author.id, true);
    }
});

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (!command?.autocomplete) return;

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
        const context = {
            disabledUntil,
            sendDailyEmbed,
            messageTracker,
            resetMessageTracker,
            sendReminders,
            currentThreadId,
            chatGptChecker // Pass the ChatGPT integration to commands
        };
        
        const result = await command.execute(interaction, context);
        if (interaction.commandName === 'disable') {
            disabledUntil = result;
        } else if (interaction.commandName === 'enable') {
            disabledUntil = result;
        } else if (interaction.commandName === 'setup-chatgpt-checker') {
            chatGptChecker.updateConfig(result);
        } else if (interaction.commandName === 'setup-smoking-checker') {
            chatGptChecker.updateSmokingConfig(result);
        } else if (interaction.commandName === 'toggle-smoking-checker') {
            chatGptChecker.updateSmokingConfig({ isActive: result.isActive });
        } else if (interaction.commandName === 'toggle-chatgpt-checker') {
            chatGptChecker.updateConfig({ isActive: result.isActive });
        }
    } catch (error) {
        console.error(error);
        const reply = { content: 'There was an error executing this command!', ephemeral: true };
        if (interaction.deferred) {
            await interaction.editReply(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);