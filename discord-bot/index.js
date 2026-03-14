require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const Parser = require('rss-parser');
const axios = require('axios');
const cron = require('node-cron');
const ConflictGlobeAI = require('./ai-agent');
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

// Initialize AI agent
const aiAgent = new ConflictGlobeAI();

// AI Analysis function - runs every 30 minutes
async function runAIAnalysis() {
    try {
        const report = await aiAgent.generateReport();
        
        // Send to #updates channel
        const threatChannel = await client.channels.fetch(CHANNELS.threatAlerts);
        if (threatChannel && report.summary.critical.length > 0) {
            const alertEmbed = new EmbedBuilder()
                .setTitle('AI Threat Analysis Report')
                .setDescription('New threat analysis available')
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Critical Threats', value: String(report.summary.critical.length), inline: true },
                    { name: 'High Threats', value: String(report.summary.high.length), inline: true },
                    { name: 'Total Analyzed', value: String(report.summary.total), inline: true }
                )
                .setTimestamp();
            
            await threatChannel.send({ embeds: [alertEmbed] });
        }
        
        // Send detailed report to #dev
        const devChannel = await client.channels.fetch(CHANNELS.dev);
        if (devChannel) {
            const summary = report.summary;
            
            const devEmbed = new EmbedBuilder()
                .setTitle('AI Comprehensive Analysis Report')
                .setDescription('Full AI analysis of all Conflict Globe data sources')
                .setColor(0x0099FF)
                .addFields(
                    { name: 'Total Events Analyzed', value: String(summary.total), inline: true },
                    { name: 'Critical', value: String(summary.critical.length), inline: true },
                    { name: 'High', value: String(summary.high.length), inline: true }
                )
                .setTimestamp();
            
            // Add category breakdown
            const categories = Object.entries(summary.byCategory).map(([k, v]) => k + ': ' + v).join('\n');
            if (categories) {
                devEmbed.addFields({ name: 'By Category', value: categories, inline: false });
            }
            
            // Add recommendations
            if (report.recommendations && report.recommendations.length > 0) {
                devEmbed.addFields({ name: 'Recommendations', value: report.recommendations.join('\n'), inline: false });
            }
            
            await devChannel.send({ embeds: [devEmbed] });
        }
        
        console.log('AI analysis completed');
    } catch (error) {
        console.error('Error running AI analysis:', error.message);
    }
}

client.once('ready', async () => {
    console.log('Logged in as ' + client.user.tag + '!');
    console.log('Scheduler started...');

    // Initialize AI agent
    await aiAgent.init();

    // Live updates: Every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        console.log('[CRON] Running live updates...');
        await sendLiveUpdates();
    });

    // Hourly update: News + stats (hourly)
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Running hourly update...');
        await sendScheduledUpdate();
    });

    // AI analysis: Every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('[CRON] Running AI analysis...');
        await runAIAnalysis();
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
        return data.events;
    } catch (error) {
        console.error('Error fetching conflict data:', error.message);
        return null;
    }
}

// AI-rewrite news headlines for #general channel
async function rewriteNewsWithAI(newsItems) {
    try {
        const top3 = newsItems.slice(0, 3);
        const rewritten = [];
        
        for (const item of top3) {
            const prompt = `Rewrite this news headline as your own original content (2-3 sentences). Keep the facts but write in a fresh, original style. Do NOT mention the source.

Original: "${item.title}"

Write as if you are reporting this directly:`;

            const response = await axios.post(OLLAMA_BASE + '/chat', {
                model: 'llama3.2:latest',
                messages: [
                    { role: 'system', content: 'You are a news reporter. Rewrite headlines in your own original words.' },
                    { role: 'user', content: prompt }
                ],
                stream: false
            });
            
            const content = response.data.message.content.trim();
            rewritten.push({
                original: item.title,
                rewritten: content,
                pubDate: item.pubDate
            });
        }
        
        return rewritten;
    } catch (error) {
        console.error('Error rewriting news:', error.message);
        return newsItems.slice(0, 3).map(item => ({
            original: item.title,
            rewritten: item.title,
            pubDate: item.pubDate
        }));
    }
}

// Fetch live conflict events for #live-updates
async function sendLiveUpdates() {
    try {
        const liveChannel = await client.channels.fetch(CHANNELS.liveUpdates);
        if (!liveChannel) {
            console.log('[ERROR] Live channel not found:', CHANNELS.liveUpdates);
            return;
        }
        console.log('[LIVE] Channel found:', liveChannel.name);

        const conflictEvents = await fetchConflictData();
        if (!conflictEvents || conflictEvents.length === 0) {
            console.log('[LIVE] No events fetched');
            return;
        }
        console.log('[LIVE] Events:', conflictEvents.length);

        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        const liveEmbed = new EmbedBuilder()
            .setTitle('> LIVE: Conflict Events Feed')
            .setDescription(`Real-time events | ${timeStr}`)
            .setColor(0xFF0000)
            .setTimestamp();

        conflictEvents.slice(0, 5).forEach((event, index) => {
            const date = new Date(event.date).toLocaleTimeString();
            const location = `${event.lat.toFixed(2)}, ${event.lon.toFixed(2)}`;
            liveEmbed.addFields({
                name: `> ${index + 1}. ${event.type}`,
                value: `> ${location} | ${date}\n${event.description?.substring(0, 150) || 'No description'}\nSource: ${event.source}`,
                inline: false
            });
        });

        await liveChannel.send({ embeds: [liveEmbed] });
        console.log(`Live updates sent at ${timeStr}`);
    } catch (error) {
        console.error('Error sending live updates:', error.message);
    }
}

async function sendScheduledUpdate() {
    try {
        console.log('[SCHEDULED] Starting hourly update...');
        
        const devChannel = await client.channels.fetch(CHANNELS.dev);
        const generalChannel = await client.channels.fetch(CHANNELS.general);

        console.log('[SCHEDULED] Dev channel:', devChannel ? devChannel.name : 'NOT FOUND');
        console.log('[SCHEDULED] General channel:', generalChannel ? generalChannel.name : 'NOT FOUND');

        const newsItems = await fetchNews();
        const updateTime = new Date().toLocaleString();
        const hour = new Date().getHours();
        const minute = new Date().getMinutes();

        // #general: Top 3 AI-rewritten news headlines
        if (generalChannel && newsItems && newsItems.length > 0) {
            const rewrittenNews = await rewriteNewsWithAI(newsItems);
            
            const generalEmbed = new EmbedBuilder()
                .setTitle('> Global News Update')
                .setDescription('Top stories rewritten in original content')
                .setColor(0xFFA500)
                .setTimestamp();

            rewrittenNews.forEach((item, index) => {
                generalEmbed.addFields({
                    name: `> ${index + 1}. ${item.rewritten.substring(0, 100)}`,
                    value: `> ${new Date(item.pubDate).toLocaleTimeString()}`,
                    inline: false
                });
            });

            await generalChannel.send({ embeds: [generalEmbed] });
        }

        // #dev: Server stats only
        if (devChannel) {
            const devEmbed = new EmbedBuilder()
                .setTitle('> System Status')
                .setDescription(`Hourly stats | ${hour}:${minute.toString().padStart(2, '0')}`)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'Status', value: '> Running', inline: true },
                    { name: 'Uptime', value: `> ${Math.floor(process.uptime() / 60)}min`, inline: true },
                    { name: 'Memory', value: `> ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB`, inline: true },
                    { name: 'API', value: `> Conflict Globe`, inline: true },
                    { name: 'Sources', value: '> BBC, BleepingComputer', inline: true },
                    { name: 'Last Update', value: `> ${updateTime}`, inline: true }
                )
                .setTimestamp();
            await devChannel.send({ embeds: [devEmbed] });
        }

        console.log(`Hourly update sent at ${hour}:${minute}`);
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
