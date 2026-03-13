# n8n Integration with Conflict Globe

## Quick Start

1. Start n8n alongside Conflict Globe:
```bash
docker compose up -d n8n
```

2. Access n8n at: **http://localhost:5678**
   - Username: `admin`
   - Password: `conflict`

3. Import the workflow:
   - Go to Workflows → Import from File
   - Select `n8n-workflow.json`

## Webhook Configuration

### Receive Events from Conflict Globe

The workflow creates a webhook at: `POST /webhook/conflict-events`

Set this in your n8n environment or update the webhook URL in settings.

### Send Back to Conflict Globe

Configure the "Send Back to Globe" HTTP Request node:
- URL: `http://web:8080/api/webhook`
- Method: POST
- Body: `{ "events": [...] }`

## Environment Variables

Add to `.env`:
```env
N8N_WEBHOOK_URL=http://n8n:5678/webhook/conflict-events
N8N_API_KEY=your_n8n_api_key
```

## Features

- **Receive events** from Conflict Globe via webhook
- **Process & analyze** events with custom code
- **Enrich data** with region detection, threat scoring
- **Send back** processed events to globe
- **Log to Google Sheets** for tracking
- **Discord alerts** for critical events

## Discord Integration

Create a Discord webhook and add it to the "Discord Alert" node:
- URL: `https://discord.com/api/webhooks/YOUR_WEBHOOK_ID`

## Customizing

Edit the "Process Event" function node to add:
- Sentiment analysis
- Threat scoring algorithms
- Geofencing rules
- Custom enrichments
