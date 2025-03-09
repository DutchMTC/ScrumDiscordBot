require('dotenv').config();
const { OpenAI } = require('openai');
const cron = require('node-cron');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const ConfigStorage = require('./utils/config-storage');

/**
 * ChatGPT Role Checker Integration
 * This script provides functionality for:
 * 1. Checking messages in specific channels using ChatGPT API for absence
 * 2. Checking messages in specific channels for smoking references
 * 3. Assigning absence roles based on ChatGPT responses
 * 4. Automatically removing roles at midnight
 */

class ChatGptIntegration {
    constructor(client) {
        this.client = client;
        
        // Load configurations from storage
        const config = ConfigStorage.load();
        
        // Load absence checker config
        const savedAbsenceConfig = config.chatGptChecker || {};
        this.absenceConfig = {
            channelId: savedAbsenceConfig.channelId || null,
            roleId: savedAbsenceConfig.roleId || null,
            isActive: savedAbsenceConfig.isActive || false
        };
        
        // Load smoking checker config
        const savedSmokingConfig = config.smokingChecker || {};
        this.smokingConfig = {
            channelId: savedSmokingConfig.channelId || null,
            isActive: savedSmokingConfig.isActive || false,
            // No roleId needed as it doesn't assign a role
            sillyResponses: [
                "🚬 Smoking detected! Remember, smoking is bad for your health... and your wallet! 💸",
                "🚬 Someone's taking a smoke break! Did you know that the smoke from one cigarette contains over 7,000 chemicals? 😮",
                "🚬 Smoking alert! Fun fact: A typical smoker takes about 10 puffs per cigarette, so a person who smokes a pack (20 cigarettes) a day gets about 200 puffs daily! 🤔",
                "🚬 Smoky McSmokerson spotted! Remember, quitting smoking is hard, but so is coding with only one hand while the other holds a cigarette! 💻",
                "🚬 Smoke signals detected! In the time it takes to smoke a cigarette, you could have fixed at least one bug in your code! 🐛",
                "🚬 Someone's burning one! Did you know that your lungs can heal significantly just 1 month after quitting? 🫁",
                "🚬 Another cigarette break? That's like... 5 minutes you could have spent optimizing your algorithms! 🧠",
                "🚬 Puff puff! Remember: programmers need healthy lungs to sigh loudly when the code doesn't work! 😤"
            ]
        };
        
        console.log('ChatGPT Absence Checker loaded with config:', this.absenceConfig);
        console.log('ChatGPT Smoking Checker loaded with config:', this.smokingConfig);
        
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        this.setupListeners();
        this.setupRoleRemovalCron();
    }
    
    // Update absence checker configuration values and save to storage
    updateConfig(config) {
        this.absenceConfig = { ...this.absenceConfig, ...config };
        console.log(`Absence checker config updated: ${JSON.stringify(this.absenceConfig)}`);
        
        // Save the updated configuration
        ConfigStorage.updateSection('chatGptChecker', this.absenceConfig);
    }
    
    // Update smoking checker configuration values and save to storage
    updateSmokingConfig(config) {
        this.smokingConfig = { 
            ...this.smokingConfig, 
            ...config,
            // Always retain the silly responses
            sillyResponses: this.smokingConfig.sillyResponses 
        };
        console.log(`Smoking checker config updated:`, config);
        
        // Save the updated configuration
        ConfigStorage.updateSection('smokingChecker', { 
            isActive: this.smokingConfig.isActive,
            channelId: this.smokingConfig.channelId
        });
    }
    
    // Set up Discord.js event listeners
    setupListeners() {
        // Process new messages
        this.client.on('messageCreate', async (message) => {
            // Skip if message is from a bot
            if (message.author.bot) return;
            
            // Check if message is for absence detection
            if (this.absenceConfig.isActive && 
                this.absenceConfig.channelId && 
                this.absenceConfig.roleId &&
                message.channel.id === this.absenceConfig.channelId) {
                
                try {
                    const shouldAssignRole = await this.checkWithChatGpt(message.content, 'absence');
                    
                    if (shouldAssignRole) {
                        await this.assignRole(message.member, this.absenceConfig.roleId);
                        
                        // Create embed with red button
                        const embed = new EmbedBuilder()
                            .setTitle('Absence')
                            .setDescription(`Based on your message, it looks like you are absent today. Click the button below if this is incorrect!`)
                            .setColor('#FF0000') // Red color
                            .setTimestamp();
                        
                        // Create functional red button
                        const button = new ButtonBuilder()
                            .setCustomId(`remove_absence_${message.author.id}`) // Include user ID in the custom ID
                            .setLabel('Remove Role')
                            .setStyle(ButtonStyle.Danger); // Red button
                        
                        const row = new ActionRowBuilder()
                            .addComponents(button);
                        
                        // Send the message as an ephemeral reply only visible to the user
                        await message.reply({
                            embeds: [embed],
                            components: [row],
                            ephemeral: true // Makes it only visible to the user who triggered it
                        });
                    }
                    // If shouldAssignRole is false, don't send any message
                    
                } catch (error) {
                    console.error("Error in ChatGPT absence checker:", error);
                }
            }
            
            // Check for smoking detection in specific channel
            if (this.smokingConfig.isActive && 
                this.smokingConfig.channelId && 
                message.channel.id === this.smokingConfig.channelId) {
                
                try {
                    const isSmoking = await this.checkWithChatGpt(message.content, 'smoking');
                    
                    if (isSmoking) {
                        // Get a random silly response
                        const sillyResponse = this.smokingConfig.sillyResponses[
                            Math.floor(Math.random() * this.smokingConfig.sillyResponses.length)
                        ];
                        
                        // Reply to the message with the silly response (publicly)
                        await message.reply(sillyResponse);
                    }
                    // If isSmoking is false, don't send any message
                    
                } catch (error) {
                    console.error("Error in ChatGPT smoking checker:", error);
                }
            }
        });

        // Handle button interactions
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;
            
            // Extract the action and user ID from the button's custom ID
            const customIdParts = interaction.customId.split('_');
            if (customIdParts.length < 3) return;
            
            const action = customIdParts[1]; // "absence" 
            const userId = customIdParts[2]; // User ID
            
            // Only allow the button to be clicked by the user it was meant for
            if (interaction.user.id !== userId) {
                await interaction.reply({
                    content: "This button is not for you!",
                    ephemeral: true
                });
                return;
            }
            
            try {
                const member = interaction.guild.members.cache.get(userId);
                if (!member) return;
                
                if (action === "absence" && this.absenceConfig.roleId) {
                    await member.roles.remove(this.absenceConfig.roleId);
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
        });
    }
    
    // Set up cron job to remove roles at midnight
    setupRoleRemovalCron() {
        cron.schedule('0 0 * * *', async () => {
            try {
                // Remove absence roles
                if (this.absenceConfig.isActive && this.absenceConfig.roleId) {
                    await this.removeRolesOfType(this.absenceConfig.roleId);
                    console.log("All absence roles removed at midnight");
                }
            } catch (error) {
                console.error("Error removing roles:", error);
            }
        }, {
            timezone: "Europe/Amsterdam" // Match timezone used in index.js
        });
    }
    
    // Check message content with ChatGPT for different types of detection
    async checkWithChatGpt(messageContent, type) {
        try {
            let prompt = '';
            
            if (type === 'absence') {
                prompt = `Evaluate this message and decide if this person is absent all day today. Respond with no if you think this person is only partially absent today. Respond with ONLY 'yes' or 'no':\n\n${messageContent}`;
            }
            else if (type === 'smoking') {
                prompt = `Evaluate this message and determine if this person is indicating they're smoking today, going on a smoke break, or mentioning cigarettes/smoking in any way. Respond with ONLY 'yes' or 'no':\n\n${messageContent}`;
            }
            else {
                return false;
            }
            
            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini", // Use the GPT-4o mini model
                messages: [
                    {
                        role: "system", 
                        content: "You are a judge. You must respond with ONLY 'yes' or 'no'. Don't explain your reasoning."
                    },
                    {
                        role: "user", 
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 5
            });
            
            const answer = response.choices[0].message.content.toLowerCase().trim();
            console.log(`ChatGPT response for ${type} check on message: "${messageContent}" -> ${answer}`);
            
            return answer === 'yes';
            
        } catch (error) {
            console.error(`Error calling ChatGPT API for ${type} check:`, error);
            return false;
        }
    }
    
    // Assign role to a member
    async assignRole(member, roleId) {
        try {
            if (!member.roles.cache.has(roleId)) {
                await member.roles.add(roleId);
                console.log(`Role ${roleId} assigned to ${member.user.tag}`);
            }
        } catch (error) {
            console.error(`Error assigning role to ${member.user.tag}:`, error);
        }
    }
    
    // Remove all roles of a specific type
    async removeRolesOfType(roleId) {
        try {
            // Get all guilds the bot is in
            for (const guild of this.client.guilds.cache.values()) {
                // Fetch all members with the role
                const membersWithRole = guild.roles.cache.get(roleId)?.members;
                
                if (membersWithRole) {
                    for (const [memberId, member] of membersWithRole) {
                        await member.roles.remove(roleId);
                        console.log(`Role ${roleId} removed from ${member.user.tag}`);
                    }
                }
            }
        } catch (error) {
            console.error(`Error removing roles of type ${roleId}:`, error);
        }
    }
    
    // For backwards compatibility
    async checkMessageWithChatGpt(messageContent) {
        return this.checkWithChatGpt(messageContent, 'absence');
    }
    
    async removeAllRoles() {
        if (this.absenceConfig.roleId) {
            await this.removeRolesOfType(this.absenceConfig.roleId);
        }
    }
    
    async assignAbsenceRole(member) {
        return this.assignRole(member, this.absenceConfig.roleId);
    }
}

module.exports = ChatGptIntegration;