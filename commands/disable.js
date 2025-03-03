const { ApplicationCommandOptionType } = require('discord.js');

module.exports = {
    data: {
        name: 'disable',
        description: 'Disable scheduled messages for a specific duration',
        options: [
            {
                name: 'duration',
                type: ApplicationCommandOptionType.String,
                description: 'Duration to disable (e.g., 24h, 7d)',
                required: true,
                autocomplete: true
            }
        ]
    },
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = [
            { name: '1 hour', value: '1h' },
            { name: '6 hours', value: '6h' },
            { name: '12 hours', value: '12h' },
            { name: '24 hours', value: '24h' },
            { name: '2 days', value: '2d' },
            { name: '7 days', value: '7d' },
            { name: '14 days', value: '14d' },
            { name: '30 days', value: '30d' }
        ];

        const filtered = choices.filter(choice => 
            choice.name.toLowerCase().includes(focusedValue.toLowerCase()) ||
            choice.value.toLowerCase().includes(focusedValue.toLowerCase())
        );
        
        await interaction.respond(
            filtered.map(choice => ({ name: choice.name, value: choice.value }))
        );
    },
    async execute(interaction, { disabledUntil }) {
        const duration = interaction.options.getString('duration');
        const value = parseInt(duration);
        const unit = duration.slice(-1).toLowerCase();

        let milliseconds;
        if (unit === 'd') {
            milliseconds = value * 24 * 60 * 60 * 1000;
        } else if (unit === 'h') {
            milliseconds = value * 60 * 60 * 1000;
        } else {
            await interaction.reply({ 
                content: 'Invalid duration format. Use d for days or h for hours (e.g., 7d or 24h)',
                ephemeral: true
            });
            return null;
        }

        const newDisabledUntil = Date.now() + milliseconds;
        const enableDate = new Date(newDisabledUntil).toLocaleString('en-NL', { timeZone: 'Europe/Amsterdam' });
        await interaction.reply({ 
            content: `Scheduled messages disabled until ${enableDate} (Amsterdam time)`,
            ephemeral: true
        });
        return newDisabledUntil;
    }
};