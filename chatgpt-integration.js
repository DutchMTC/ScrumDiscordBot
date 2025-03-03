require('dotenv').config();
const { OpenAI } = require('openai');
const cron = require('node-cron');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const ConfigStorage = require('./utils/config-storage');

/**
 * ChatGPT Role Checker Integration
 * This script provides functionality for:
 * 1. Checking messages in a specific channel using ChatGPT API
 * 2. Assigning roles based on ChatGPT responses
 * 3. Automatically removing roles at midnight
 */

class ChatGptIntegration {
    constructor(client) {
        this.client = client;
        
        // Load configuration from storage
        const savedConfig = ConfigStorage.load().chatGptChecker || {};
        this.config = {
            channelId: savedConfig.channelId || null,
            roleId: savedConfig.roleId || null,
            isActive: savedConfig.isActive || false
        };
        
        console.log('ChatGPT Checker loaded with config:', this.config);
        
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.setupListeners();
        this.setupRoleRemovalCron();
    }
    
    // Update configuration values and save to storage
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        console.log(`ChatGPT role checker config updated: ${JSON.stringify(this.config)}`);
        
        // Save the updated configuration
        ConfigStorage.updateSection('chatGptChecker', this.config);
    }
    
    // Set up Discord.js event listeners
    setupListeners() {
        // Process new messages
        this.client.on('messageCreate', async (message) => {
            // Skip if feature is not active or message is from a bot
            if (!this.config.isActive || 
                !this.config.channelId || 
                !this.config.roleId ||
                message.author.bot || 
                message.channel.id !== this.config.channelId) {
                return;
            }
            
            try {
                const shouldAssignRole = await this.checkMessageWithChatGpt(message.content);
                
                if (shouldAssignRole) {
                    await this.assignRole(message.member);
                    
                    // Create embed with red button
                    const embed = new EmbedBuilder()
                        .setTitle('Absence')
                        .setDescription(`Based on your message, it looks like you are absent today. Click the button below if this is incorrect!`)
                        .setColor('#FF0000') // Red color
                        .setTimestamp();
                    
                    // Create functional red button
                    const button = new ButtonBuilder()
                        .setCustomId(`remove_role_${message.author.id}`) // Include user ID in the custom ID
                        .setLabel('Remove Role')
                        .setStyle(ButtonStyle.Danger); // Red button
                    
                    const row = new ActionRowBuilder()
                        .addComponents(button);
                    
                    // Send the message as an ephemeral reply only visible to the user who received the role
                    await message.reply({
                        embeds: [embed],
                        components: [row],
                        ephemeral: true // Makes it only visible to the user who triggered it
                    });
                }
                // If shouldAssignRole is false, don't send any message
                
            } catch (error) {
                console.error("Error in ChatGPT role checker:", error);
            }
        });

        // Handle button interactions
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;
            
            // Check if this is one of our role removal buttons
            if (interaction.customId.startsWith('remove_role_')) {
                const userId = interaction.customId.split('_')[2]; // Get the user ID from the button's custom ID
                
                // Only allow the button to be clicked by the user who was assigned the role
                if (interaction.user.id !== userId) {
                    await interaction.reply({
                        content: "This button is not for you!",
                        ephemeral: true
                    });
                    return;
                }
                
                try {
                    // Remove the role from the user
                    const member = interaction.guild.members.cache.get(userId);
                    if (member) {
                        await member.roles.remove(this.config.roleId);
                        await interaction.reply({
                            content: "Your absence role has been removed.",
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    console.error(`Error removing role:`, error);
                    await interaction.reply({
                        content: "There was an error removing your role.",
                        ephemeral: true
                    });
                }
            }
        });
    }
    
    // Set up cron job to remove roles at midnight
    setupRoleRemovalCron() {
        cron.schedule('0 0 * * *', async () => {
            if (!this.config.isActive || !this.config.roleId) return;
            
            try {
                await this.removeAllRoles();
                console.log("All special roles removed at midnight");
            } catch (error) {
                console.error("Error removing roles:", error);
            }
        }, {
            timezone: "Europe/Amsterdam" // Match timezone used in index.js
        });
    }
    
    // Check message content with ChatGPT
    async checkMessageWithChatGpt(messageContent) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini", // Use the GPT-4o mini model
                messages: [
                    {
                        role: "system", 
                        content: "You are a judge. You must respond with ONLY 'yes' or 'no'. Don't explain your reasoning."
                    },
                    {
                        role: "user", 
                        content: `Evaluate this message and decide if this person is absent today. Respond with ONLY 'yes' or 'no':\n\n${messageContent}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 5
            });
            
            const answer = response.choices[0].message.content.toLowerCase().trim();
            console.log(`ChatGPT response for message: "${messageContent}" -> ${answer}`);
            
            return answer === 'yes';
            
        } catch (error) {
            console.error("Error calling ChatGPT API:", error);
            return false;
        }
    }
    
    // Assign the special role to a member
    async assignRole(member) {
        try {
            if (!member.roles.cache.has(this.config.roleId)) {
                await member.roles.add(this.config.roleId);
                console.log(`Role ${this.config.roleId} assigned to ${member.user.tag}`);
            }
        } catch (error) {
            console.error(`Error assigning role to ${member.user.tag}:`, error);
        }
    }
    
    // Remove the special role from all members
    async removeAllRoles() {
        if (!this.config.roleId) return;
        
        try {
            // Get all guilds the bot is in
            for (const guild of this.client.guilds.cache.values()) {
                // Fetch all members with the role
                const membersWithRole = guild.roles.cache.get(this.config.roleId)?.members;
                
                if (membersWithRole) {
                    for (const [memberId, member] of membersWithRole) {
                        await member.roles.remove(this.config.roleId);
                        console.log(`Role removed from ${member.user.tag}`);
                    }
                }
            }
        } catch (error) {
            console.error("Error removing roles:", error);
        }
    }
}

module.exports = ChatGptIntegration;