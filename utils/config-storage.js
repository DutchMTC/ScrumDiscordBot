const fs = require('fs');
const path = require('path');

// Path to the config file
const CONFIG_FILE = path.join(__dirname, '../config.json');

/**
 * Configuration storage utility
 * Handles saving and loading configuration to/from a JSON file
 */
class ConfigStorage {
    /**
     * Load the configuration from disk
     * @returns {Object} The loaded configuration or a default one if not found
     */
    static load() {
        try {
            // Check if config file exists
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf8');
                const config = JSON.parse(data);
                console.log('Configuration loaded from disk');
                return config;
            }
            
            // Return default config if file doesn't exist
            return {
                chatGptChecker: {
                    channelId: null,
                    roleId: null,
                    isActive: false
                },
                smokingChecker: {
                    channelId: null,
                    roleId: null,
                    isActive: false
                }
            };
        } catch (error) {
            console.error('Error loading configuration:', error);
            // Return default config on error
            return {
                chatGptChecker: {
                    channelId: null,
                    roleId: null,
                    isActive: false
                },
                smokingChecker: {
                    channelId: null,
                    roleId: null,
                    isActive: false
                }
            };
        }
    }

    /**
     * Save the configuration to disk
     * @param {Object} config - The configuration to save
     */
    static save(config) {
        try {
            // Make sure the directory exists
            const dir = path.dirname(CONFIG_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Write the config to file
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            console.log('Configuration saved to disk');
            return true;
        } catch (error) {
            console.error('Error saving configuration:', error);
            return false;
        }
    }

    /**
     * Update a specific section of the configuration
     * @param {string} section - The section to update
     * @param {Object} data - The data to update in the section
     */
    static updateSection(section, data) {
        const config = this.load();
        config[section] = { ...config[section], ...data };
        return this.save(config);
    }
}

module.exports = ConfigStorage;