# Conflict Globe Discord Bot

## Setup Instructions

### 1. Environment Configuration
Create a `.env` file in the `discord-bot` directory with your bot token and channel IDs:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
CONFLICT_GLOBE_API=http://localhost:8080/api/conflicts
LIVE_UPDATES_CHANNEL_ID=your_live_updates_channel_id
THREAT_ALERTS_CHANNEL_ID=your_threat_alerts_channel_id
GENERAL_CHANNEL_ID=your_general_channel_id
DEV_CHANNEL_ID=your_dev_channel_id
```

See `.env.example` for reference.

### 2. Adding the Bot to Your Server
Use this invite link to add the bot to your Discord server:

```
https://discord.com/oauth2/authorize?client_id=1482276856257314958&permissions=534723950656&scope=bot
```

**Permissions included:**
- View Channel (1024)
- Send Messages (2048)

### 3. Running the Bot
```bash
cd discord-bot
node index.js
```

### 4. Slash Commands
The bot uses Discord slash commands. Type `/` in chat to see available commands:

**Basic Commands:**
- `/conflict status` - Check Conflict Globe status
- `/conflict news` - Get latest world news from BBC and BleepingComputer
- `/conflict data` - Get latest conflict events from local API
- `/conflict testpush` - Test scheduled push (manual trigger)
- `/ping` - Test if bot is responding

**Threat Analysis Commands:**
- `/conflict threats` - Show critical threats detected (uses Ollama AI)
- `/conflict profiles` - Show threat profiles and patterns
- `/conflict report` - Generate threat analysis report
- `/conflict analyze` - Manually analyze new events

### 5. Automated Pushing
The bot automatically pushes updates to multiple Discord channels:

**Hourly Updates**:
- `#live-updates` - Basic status, news, and events
- `#general` - Basic status, news, and events
- `#dev` - Detailed technical info (requires bot re-invite with dev channel access)

**Critical Threat Alerts**:
- `#updates` - Basic threat alerts
- `#general` - Basic threat alerts
- `#dev` - Detailed threat analysis with indicators and recommendations (requires bot re-invite)

**Frequency**: Every hour (at minute 0 of each hour)

**Channel Configuration**:
- `#live-updates`: Main update channel with all information
- `#updates`: Critical threat alerts channel
- `#general`: General announcements and updates
- `#dev`: Detailed technical information (requires additional permissions)

### 6. Threat Analysis System
The bot includes an AI-powered threat analysis system using Ollama:

**Features:**
- **Pattern Analysis**: Uses Ollama AI to analyze event descriptions for threat patterns
- **Critical Threat Storage**: Stores detected critical threats with analysis data
- **Threat Profiles**: Builds profiles for different threat types and sources
- **Automated Reports**: Generates comprehensive threat analysis reports

**Threat Levels:**
- Critical: Immediate action required
- High: Significant threat, monitor closely
- Medium: Potential threat, note for analysis
- Low: Minimal threat, general awareness

**Pattern Types:**
- Military Mobilization
- Terrorist Activity
- Cyber Attack
- Geopolitical Tension
- Infrastructure Target
- Energy Crisis
- Naval Activity
- Air Activity
- Other

### 7. Running Threat Scanner
For continuous threat analysis, run the threat scanner:

```bash
cd discord-bot
node threat-scanner.js
```

The scanner runs every 30 minutes and analyzes all new events.

### 8. Running as a Background Service
To keep the bot running 24/7, consider using:
- PM2: `pm2 start index.js --name conflict-globe-bot`
- systemd service
- Docker container

## Configuration
Edit `index.js` to change:
- `TARGET_CHANNEL_ID`: Discord channel ID for automated posts
- Cron schedule: Modify the `cron.schedule()` expression

Edit `threat-analysis.js` to change:
- `model`: Ollama model to use (default: llama3.2:latest)
- Analysis prompts and thresholds

## Data Storage
Threat data is stored in `/home/c0smic/discord-bot/threat-data/`:
- `critical-threats.json`: Detected critical threats
- `threat-profiles.json`: Threat pattern profiles
- `reports.json`: Generated reports

## Notes
- The bot uses Discord.js v14
- Required intents: Guilds, GuildMessages
- Slash commands are registered globally (may take up to 1 hour to propagate)
- The bot fetches data from your local Conflict Globe instance at `http://localhost:8080/api/conflicts`
- Ollama must be running on localhost:11434 for threat analysis
- Threat analysis is performed using the llama3.2:latest model by default
