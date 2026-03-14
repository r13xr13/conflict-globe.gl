require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const Parser = require('rss-parser');
const axios = require('axios');
const cron = require('node-cron');
const ThreatAnalyzer = require('./threat-analysis');
const parser = new Parser();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

const TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const CONFLICT_GLOBE_API = process.env.CONFLICT_GLOBE_API || 'http://localhost:8080/api/conflicts';

// Channel configurations (from environment variables or defaults)
const CHANNELS = {
    liveUpdates: process.env.LIVE_UPDATES_CHANNEL_ID || '1482135927043391650',
    threatAlerts: process.env.THREAT_ALERTS_CHANNEL_ID || '1480287712366952509',
    general: process.env.GENERAL_CHANNEL_ID || '1480010187107733545',
    dev: process.env.DEV_CHANNEL_ID || '1480238458177064960'
};

// Initialize threat analyzer
const threatAnalyzer = new ThreatAnalyzer();

// Alert callback for threat analyzer
async function alertCallback(threat) {
    try {
        const threatChannel = await client.channels.fetch(CHANNELS.threatAlerts);
        const devChannel = await client.channels.fetch(CHANNELS.dev);

        if (!threatChannel) return;

        const date = new Date(threat.date).toLocaleString();
        const location = `${threat.lat.toFixed(2)}, ${threat.lon.toFixed(2)}`;
        const level = threat.analysis?.threatLevel || 'Unknown';
        const pattern = threat.analysis?.patternType || 'Unknown';

        // Basic alert - ONLY to #updates channel
        const basicEmbed = new EmbedBuilder()
            .setTitle('🚨 CRITICAL THREAT DETECTED')
            .setDescription(threat.type)
            .setColor(level === 'Critical' ? 0xFF0000 : 0xFFA500)
            .addFields(
                { name: 'Location', value: location, inline: true },
                { name: 'Date', value: date, inline: true },
                { name: 'Threat Level', value: level, inline: true },
                { name: 'Pattern Type', value: pattern, inline: true },
                { name: 'Source', value: threat.source, inline: true }
            )
            .setTimestamp();

        await threatChannel.send({ embeds: [basicEmbed] });

        // Detailed alert for dev channel
        if (devChannel) {
            const devEmbed = new EmbedBuilder()
                .setTitle('🚨 CRITICAL THREAT DETECTED (Detailed)')
                .setDescription(threat.type)
                .setColor(level === 'Critical' ? 0xFF0000 : 0xFFA500)
                .addFields(
                    { name: 'Location', value: location, inline: true },
                    { name: 'Date', value: date, inline: true },
                    { name: 'Threat Level', value: level, inline: true },
                    { name: 'Pattern Type', value: pattern, inline: true },
                    { name: 'Source', value: threat.source, inline: true },
                    { name: 'Indicators', value: threat.analysis?.indicators?.join(', ') || 'None', inline: false },
                    { name: 'Confidence', value: `${threat.analysis?.confidence || 'N/A'}%`, inline: true },
                    { name: 'Recommended Actions', value: threat.analysis?.recommendedActions?.join('\n') || 'None', inline: false }
                )
                .setTimestamp();

            try {
                await devChannel.send({ embeds: [devEmbed] });
            } catch (err) {
                console.log(`Failed to send detailed threat alert to #dev: ${err.message}`);
            }
        }

        console.log(`Threat alert sent for: ${threat.type}`);
    } catch (error) {
        console.error('Error sending threat alert:', error.message);
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Scheduler started: pushing updates every hour...');

    // Initialize threat analyzer
    await threatAnalyzer.init();
    threatAnalyzer.setAlertCallback(alertCallback);

    // Schedule task: Every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('Running scheduled update...');
        await sendScheduledUpdate();
    });

    // Schedule pattern analysis: Every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('Running pattern analysis...');
        await threatAnalyzer.fetchAndAnalyze();
    });
});

async function fetchNews() {
    try {
        const [bbcFeed, bleepingComputerFeed] = await Promise.all([
            parser.parseURL('https://feeds.bbci.co.uk/news/world/rss.xml'),
            parser.parseURL('https://www.bleepingcomputer.com/feed/')
        ]);

        const allItems = [
            ...bbcFeed.items.map(item => ({ ...item, source: 'BBC World News' })),
            ...bleepingComputerFeed.items.map(item => ({ ...item, source: 'BleepingComputer' }))
        ];

        allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        return allItems.slice(0, 5);
    } catch (error) {
        console.error('Error fetching news:', error.message);
        return null;
    }
}

async function fetchConflictData() {
    try {
        const response = await axios.get(CONFLICT_GLOBE_API, { timeout: 30000 });
        const data = response.data;
        if (!data.events || data.events.length === 0) return null;
        return data.events.slice(0, 5);
    } catch (error) {
        console.error('Error fetching conflict data:', error.message);
        return null;
    }
}

async function sendScheduledUpdate() {
    try {
        // Fetch channels
        const liveChannel = await client.channels.fetch(CHANNELS.liveUpdates);
        const devChannel = await client.channels.fetch(CHANNELS.dev);
        const generalChannel = await client.channels.fetch(CHANNELS.general);

        if (!liveChannel) {
            console.error(`Channel ${CHANNELS.liveUpdates} not found`);
            return;
        }

        // 1. Fetch data
        const [newsItems, conflictEvents] = await Promise.all([
            fetchNews(),
            fetchConflictData()
        ]);

        const updateTime = new Date().toLocaleString();
        const hour = new Date().getHours();

        // 2. Status Embed - Different versions for different channels
        
        // #live-updates: Full status
        const liveStatusEmbed = new EmbedBuilder()
            .setTitle('🌍 Conflict Globe: Hourly Update')
            .setDescription(`Update #${hour}: Full status, news, and events`)
            .setColor(0x0099FF)
            .addFields(
                { name: 'System Status', value: '✅ Online', inline: true },
                { name: 'Data Sources', value: '✅ Active', inline: true },
                { name: 'Last Update', value: updateTime, inline: true }
            )
            .setTimestamp();
        await liveChannel.send({ embeds: [liveStatusEmbed] });

        // #general: Minimal status only
        const generalStatusEmbed = new EmbedBuilder()
            .setTitle('🌍 Conflict Globe Status')
            .setDescription(`System online - Update #${hour}`)
            .setColor(0x0099FF)
            .addFields(
                { name: 'Status', value: '✅ Online', inline: true },
                { name: 'Time', value: updateTime, inline: true }
            )
            .setTimestamp();
        if (generalChannel) await generalChannel.send({ embeds: [generalStatusEmbed] });
        
        // #dev: Detailed technical status
        if (devChannel) {
            const devStatusEmbed = new EmbedBuilder()
                .setTitle('🌍 Conflict Globe: Hourly Status (Detailed)')
                .setDescription(`Technical update #${hour}`)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'System Status', value: '✅ Online', inline: true },
                    { name: 'Data Sources', value: '✅ Active', inline: true },
                    { name: 'API Endpoint', value: CONFLICT_GLOBE_API, inline: false },
                    { name: 'Last Update', value: updateTime, inline: true },
                    { name: 'News Sources', value: 'BBC, BleepingComputer', inline: true },
                    { name: 'Analysis Model', value: 'llama3.2:latest', inline: true }
                )
                .setTimestamp();
            try {
                await devChannel.send({ embeds: [devStatusEmbed] });
            } catch (err) {
                console.log(`Failed to send to #dev: ${err.message}`);
            }
        }

        // 3. News Embed - Only to #live-updates and #dev
        if (newsItems && newsItems.length > 0) {
            const newsEmbed = new EmbedBuilder()
                .setTitle('🌍 Conflict Globe: Global News')
                .setColor(0xFFA500)
                .setTimestamp();

            newsItems.forEach((item, index) => {
                const description = item.contentSnippet ? item.contentSnippet.substring(0, 100) + '...' : 'No description';
                const source = item.source || 'Unknown';
                newsEmbed.addFields({
                    name: `${index + 1}. ${item.title}`,
                    value: `${description}\n[Source: ${source}] | [Read more](${item.link})`,
                    inline: false
                });
            });

            await liveChannel.send({ embeds: [newsEmbed] });
            
            // Dev gets raw news data
            if (devChannel) {
                const devNewsEmbed = new EmbedBuilder()
                    .setTitle('📰 Raw News Data')
                    .setDescription('Unformatted news items for debugging')
                    .setColor(0xFFA500)
                    .setTimestamp();
                
                newsItems.forEach((item, index) => {
                    devNewsEmbed.addFields({
                        name: `Item ${index + 1}`,
                        value: `\`\`\`json\n${JSON.stringify({
                            title: item.title,
                            source: item.source,
                            link: item.link,
                            pubDate: item.pubDate
                        }, null, 2)}\n\`\`\``,
                        inline: false
                    });
                });
                
                try {
                    await devChannel.send({ embeds: [devNewsEmbed] });
                } catch (err) {
                    console.log(`Failed to send news to #dev: ${err.message}`);
                }
            }
        }

        // 4. Events Embed - Only to #live-updates and #dev
        if (conflictEvents && conflictEvents.length > 0) {
            const eventsEmbed = new EmbedBuilder()
                .setTitle('🌍 Conflict Globe: Latest Events')
                .setColor(0xFF0000)
                .setTimestamp();

            conflictEvents.forEach((event, index) => {
                const date = new Date(event.date).toLocaleString();
                const location = `${event.lat.toFixed(2)}, ${event.lon.toFixed(2)}`;
                eventsEmbed.addFields({
                    name: `${index + 1}. ${event.type}`,
                    value: `📍 ${location} | 📅 ${date}\n${event.description?.substring(0, 150) || 'No description'}\n[Source: ${event.source}]`,
                    inline: false
                });
            });

            await liveChannel.send({ embeds: [eventsEmbed] });
            
            // Dev gets raw event data
            if (devChannel) {
                const devEventsEmbed = new EmbedBuilder()
                    .setTitle('📋 Raw Event Data')
                    .setDescription('Unformatted event data for debugging')
                    .setColor(0xFF0000)
                    .setTimestamp();
                
                conflictEvents.forEach((event, index) => {
                    devEventsEmbed.addFields({
                        name: `Event ${index + 1}`,
                        value: `\`\`\`json\n${JSON.stringify({
                            type: event.type,
                            source: event.source,
                            category: event.category,
                            lat: event.lat,
                            lon: event.lon,
                            date: event.date
                        }, null, 2)}\n\`\`\``,
                        inline: false
                    });
                });
                
                try {
                    await devChannel.send({ embeds: [devEventsEmbed] });
                } catch (err) {
                    console.log(`Failed to send events to #dev: ${err.message}`);
                }
            }
        }

        console.log(`Scheduled update #${hour} sent successfully`);
    } catch (error) {
        console.error('Error sending scheduled update:', error.message);
    }
}

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'ping') {
        await interaction.reply('Pong!');
        return;
    }

    if (commandName === 'conflict') {
        const subcommand = options.getSubcommand();

        switch (subcommand) {
            case 'status':
                const guildCount = client.guilds.cache.size;
                if (guildCount === 0) {
                    await interaction.reply('🌍 Conflict Globe Status: Bot not added to any server.\nAdd the bot using this link:\nhttps://discord.com/oauth2/authorize?client_id=1482276856257314958&permissions=534723950656&scope=bot');
                } else {
                    // Check which channels we can access
                    let channelsList = '';
                    for (const [name, id] of Object.entries(CHANNELS)) {
                        try {
                            const channel = await client.channels.fetch(id);
                            channelsList += `✅ #${channel.name} (${name})\n`;
                        } catch (err) {
                            channelsList += `❌ ${name} (no access)\n`;
                        }
                    }
                    
                    await interaction.reply(`🌍 Conflict Globe Status: Active\nServer count: ${guildCount}\n\n**Channel Access:**\n${channelsList}\n\n**Schedule:** Hourly updates at minute 0`);
                }
                break;

            case 'news':
                await interaction.deferReply();
                const newsItems = await fetchNews();
                if (newsItems && newsItems.length > 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('🌍 Conflict Globe: Latest World News')
                        .setColor(0x0099FF)
                        .setTimestamp();

                    newsItems.forEach((item, index) => {
                        const description = item.contentSnippet ? item.contentSnippet.substring(0, 100) + '...' : 'No description';
                        const source = item.source || 'Unknown';
                        embed.addFields({
                            name: `${index + 1}. ${item.title}`,
                            value: `${description}\n[Source: ${source}] | [Read more](${item.link})`,
                            inline: false
                        });
                    });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply('Unable to fetch news at the moment.');
                }
                break;

            case 'data':
                await interaction.deferReply();
                const conflictEvents = await fetchConflictData();
                if (conflictEvents && conflictEvents.length > 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('🌍 Conflict Globe: Latest Events')
                        .setColor(0xFF0000)
                        .setTimestamp();

                    conflictEvents.forEach((event, index) => {
                        const date = new Date(event.date).toLocaleString();
                        const location = `${event.lat.toFixed(2)}, ${event.lon.toFixed(2)}`;
                        embed.addFields({
                            name: `${index + 1}. ${event.type}`,
                            value: `📍 ${location} | 📅 ${date}\n${event.description?.substring(0, 150) || 'No description'}\n[Source: ${event.source}]`,
                            inline: false
                        });
                    });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply('Unable to fetch conflict data at the moment.');
                }
                break;

            case 'testpush':
                await interaction.reply('Testing scheduled push to channel...');
                await sendScheduledUpdate();
                break;

            case 'threats':
                await interaction.deferReply();
                const threats = threatAnalyzer.getCriticalThreats(10);
                if (threats.length > 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('🚨 Critical Threats Detected')
                        .setColor(0xFF0000)
                        .setTimestamp();

                    threats.forEach((threat, index) => {
                        const date = new Date(threat.date).toLocaleString();
                        const location = `${threat.lat.toFixed(2)}, ${threat.lon.toFixed(2)}`;
                        const level = threat.analysis?.threatLevel || 'Unknown';
                        const pattern = threat.analysis?.patternType || 'Unknown';

                        embed.addFields({
                            name: `${index + 1}. ${threat.type}`,
                            value: `📍 ${location} | 📅 ${date}\n🚨 Level: ${level} | Pattern: ${pattern}`,
                            inline: false
                        });
                    });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply('No critical threats detected yet.');
                }
                break;

            case 'profiles':
                await interaction.deferReply();
                const profiles = threatAnalyzer.getThreatProfiles();
                if (profiles.length > 0) {
                    const embed = new EmbedBuilder()
                        .setTitle('📊 Threat Profiles')
                        .setColor(0xFFA500)
                        .setTimestamp();

                    profiles.slice(0, 5).forEach((profile, index) => {
                        embed.addFields({
                            name: `${index + 1}. ${profile.patternType} (${profile.source})`,
                            value: `Events: ${profile.eventCount} | Avg Confidence: ${profile.avgConfidence?.toFixed(1) || 'N/A'}\nFirst: ${new Date(profile.firstSeen).toLocaleDateString()}`,
                            inline: false
                        });
                    });

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply('No threat profiles available yet.');
                }
                break;

            case 'report':
                await interaction.deferReply();
                const report = await threatAnalyzer.generateReport();
                const embed = new EmbedBuilder()
                    .setTitle('📋 Threat Analysis Report')
                    .setColor(0x00FF00)
                    .setTimestamp()
                    .addFields(
                        { name: 'Summary', value: `Total Events: ${report.summary.totalEvents}\nCritical: ${report.summary.criticalCount}\nHigh: ${report.summary.highCount}`, inline: false },
                        { name: 'Pattern Analysis', value: Object.entries(report.patternAnalysis).map(([k, v]) => `${k}: ${v}`).join('\n') || 'No patterns detected', inline: false }
                    );

                if (report.recommendations.length > 0) {
                    embed.addFields({
                        name: 'Recommendations',
                        value: report.recommendations.map(r => `• ${r}`).join('\n'),
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
                break;

            case 'analyze':
                await interaction.deferReply();
                const count = await threatAnalyzer.fetchAndAnalyze();
                await interaction.editReply(`Analyzed ${count} new events and updated threat profiles.`);
                break;

            default:
                await interaction.reply('Unknown subcommand.');
        }
    }
});

client.login(TOKEN);
