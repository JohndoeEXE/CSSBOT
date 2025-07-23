const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Store ticket data temporarily
const ticketData = new Map();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Command to create ticket panel
client.on('messageCreate', async (message) => {
    if (message.content === '!ticket-panel' && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Create a Ticket')
            .setDescription('Select what you want to purchase:')
            .setColor('#0099ff');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('Camshows')
                    .setLabel('Camshows')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎞'),
                new ButtonBuilder()
                    .setCustomId('Fansigns')
                    .setLabel('Fansigns')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎀'),
                new ButtonBuilder()
                    .setCustomId('Content')
                    .setLabel('Content')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎬')
            );

        message.channel.send({ embeds: [embed], components: [row] });
        message.delete();
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;

    // Handle main category selection
    if (['Camshows', 'Fansigns', 'Content'].includes(interaction.customId)) {
        ticketData.set(userId, { category: interaction.customId });

        if (interaction.customId === 'Camshows') {
            // Show account duration options
            const embed = new EmbedBuilder()
                .setTitle('⏰ Select Camshow Duration')
                .setDescription('Choose Cam Duration:')
                .setColor('#ff6b35');

            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('5m_30')
                        .setLabel('5 minutes - $30')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('10m_45')
                        .setLabel('10 minutes - $45')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('15m_55')
                        .setLabel('15 minutes - $55')
                        .setStyle(ButtonStyle.Primary)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('20m_65')
                        .setLabel('20 minutes - $65')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('30m_80')
                        .setLabel('30 minutes - $80')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('1h_120')
                        .setLabel('1 hour - $120')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({ embeds: [embed], components: [row1, row2], ephemeral: true });
        } else {
            // For skin and video, go straight to payment options
            showPaymentOptions(interaction, interaction.customId);
        }
    }

    // Handle account duration selection
    if (['5m_30', '10m_45', '15m_55', '20m_65', '30m_80', '1h_120'].includes(interaction.customId)) {
        const data = ticketData.get(userId);
        if (data) {
            data.duration = interaction.customId;
            ticketData.set(userId, data);
        }
        showPaymentOptions(interaction, 'Camshows', interaction.customId);
    }

    // Handle payment method selection
    if (['crypto', 'giftcards', 'roblox_limiteds'].includes(interaction.customId)) {
        const data = ticketData.get(userId);
        if (data) {
            data.payment = interaction.customId;
            await createTicket(interaction, data);
        }
    }
});

async function showPaymentOptions(interaction, category, duration = null) {
    const embed = new EmbedBuilder()
        .setTitle('💳 Select Payment Method')
        .setDescription('Choose your preferred payment method:')
        .setColor('#32cd32');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('crypto')
                .setLabel('Crypto')
                .setStyle(ButtonStyle.Success)
                .setEmoji('₿'),
            new ButtonBuilder()
                .setCustomId('giftcards')
                .setLabel('Gift Cards')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎁'),
            new ButtonBuilder()
                .setCustomId('roblox_limiteds')
                .setLabel('Roblox Limiteds (Mid-High Tiers)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🎮')
        );

    if (duration) {
        await interaction.update({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
}

async function createTicket(interaction, data) {
    const guild = interaction.guild;
    const user = interaction.user;

    // Create ticket channel
    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: null, // You can set a category ID here if you have one
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ],
            },
            // Add staff roles here if needed
        ],
    });

    // Format the purchase details
    let purchaseDetails = '';
    let paymentMethod = '';

    switch (data.category) {
        case 'fortnite_account':
            const durationMap = {
                '5m_30': '5 minutes - $30',
                '10m_45': '10 minutes - $45',
                '15m_55': '15 minutes - $55',
                '20m_65': '20 minutes - $65',
                '30m_80': '30 minutes - $80',
                '1h_120': '1 hour - $120'
            };
            purchaseDetails = `Camshows (${durationMap[data.duration]})`;
            break;
        case 'Camshows':
            purchaseDetails = 'Fansigns';
            break;
        case 'fortnite_video':
            purchaseDetails = 'Content';
            break;
    }

    switch (data.payment) {
        case 'crypto':
            paymentMethod = 'Cryptocurrency';
            break;
        case 'giftcards':
            paymentMethod = 'Gift Cards';
            break;
        case 'roblox_limiteds':
            paymentMethod = 'Roblox Limiteds (Mid-High Tiers)';
            break;
    }

    // Create ticket embed
    const ticketEmbed = new EmbedBuilder()
        .setTitle('🎫 New Ticket Created')
        .setDescription(`Hello ${user}, welcome to your ticket!`)
        .addFields(
            { name: '🛒 Purchase', value: purchaseDetails, inline: true },
            { name: '💳 Payment Method', value: paymentMethod, inline: true },
            { name: '👤 Customer', value: user.toString(), inline: true }
        )
        .setColor('#ffd700')
        .setTimestamp()
        .setFooter({ text: 'Ticket System', iconURL: guild.iconURL() });

    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

    await ticketChannel.send({ 
        content: `${user} Staff will be with you shortly!`, 
        embeds: [ticketEmbed], 
        components: [closeButton] 
    });

    // Clean up ticket data
    ticketData.delete(user.id);

    // Update interaction
    await interaction.update({
        content: `✅ Ticket created! Please check ${ticketChannel}`,
        embeds: [],
        components: []
    });
}

// Handle ticket closing
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'close_ticket') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({ content: '❌ You do not have permission to close tickets.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription('This ticket has been closed. The channel will be deleted in 5 seconds.')
            .setColor('#ff0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        setTimeout(() => {
            interaction.channel.delete();
        }, 5000);
    }
});

// Login with your bot token from environment variable
client.login(process.env.DISCORD_TOKEN);
