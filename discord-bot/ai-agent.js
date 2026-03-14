require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const OLLAMA_BASE = 'http://localhost:11434/api';
const CONFLICT_GLOBE_API = process.env.CONFLICT_GLOBE_API || 'http://localhost:8080/api/conflicts';
const STORAGE_DIR = path.join(__dirname, 'threat-data');

// Model recommendations based on task type
const MODEL_SELECTION = {
    conflict: {
        model: 'llama3.2:latest',
        prompt: 'You are a military intelligence analyst specializing in conflict analysis.'
    },
    cyber: {
        model: 'llama3.2:latest',
        prompt: 'You are a cybersecurity expert specializing in threat intelligence.'
    },
    maritime: {
        model: 'qwen2.5:7b',
        prompt: 'You are a maritime security analyst specializing in naval activity.'
    },
    air: {
        model: 'llama3.1:8b-instruct-q4_K_M',
        prompt: 'You are an aviation security analyst specializing in air operations.'
    },
    space: {
        model: 'qwen2.5:7b',
        prompt: 'You are a space domain analyst specializing in orbital activity.'
    },
    weather: {
        model: 'mistral:latest',
        prompt: 'You are a meteorologist and disaster response expert.'
    },
    earthquakes: {
        model: 'mistral:latest',
        prompt: 'You are a seismologist specializing in earthquake analysis.'
    },
    social: {
        model: 'llama3.2:latest',
        prompt: 'You are a social media intelligence analyst specializing in OSINT.'
    },
    radio: {
        model: 'phi3:latest',
        prompt: 'You are a signals intelligence (SIGINT) analyst.'
    },
    cameras: {
        model: 'llama3.2:latest',
        prompt: 'You are a surveillance analyst specializing in CCTV footage.'
    },
    land: {
        model: 'llama3.2:latest',
        prompt: 'You are a ground operations analyst specializing in land-based military activity.'
    },
    default: {
        model: 'llama3.2:latest',
        prompt: 'You are a geopolitical intelligence analyst.'
    }
};

class ConflictGlobeAI {
    constructor() {
        this.availableModels = [];
        this.analyzedEvents = new Map();
    }

    async init() {
        console.log('Initializing Conflict Globe AI Agent...');
        await this.fetchAvailableModels();
        console.log('Available models: ' + this.availableModels.join(', '));
        await this.loadData();
    }

    async loadData() {
        try {
            await fs.mkdir(STORAGE_DIR, { recursive: true });
            
            try {
                const data = await fs.readFile(path.join(STORAGE_DIR, 'ai-analyzed.json'), 'utf8');
                this.analyzedEvents = new Map(JSON.parse(data));
            } catch {
                this.analyzedEvents = new Map();
            }
        } catch (error) {
            console.error('Error loading data:', error.message);
        }
    }

    async saveData() {
        try {
            await fs.writeFile(
                path.join(STORAGE_DIR, 'ai-analyzed.json'),
                JSON.stringify([...this.analyzedEvents], null, 2)
            );
        } catch (error) {
            console.error('Error saving data:', error.message);
        }
    }

    async fetchAvailableModels() {
        try {
            const response = await axios.get(OLLAMA_BASE + '/tags');
            this.availableModels = response.data.models.map(m => m.name);
        } catch (error) {
            console.error('Error fetching models:', error.message);
            this.availableModels = [
                'llama3.2:latest',
                'llama3.1:8b-instruct-q4_K_M',
                'mistral:latest',
                'qwen2.5:7b',
                'qwen2.5:3b',
                'phi3:latest',
                'codellama:latest',
                'nomic-embed-text:latest'
            ];
        }
    }

    getModelForCategory(category) {
        const selection = MODEL_SELECTION[category] || MODEL_SELECTION.default;
        
        if (!this.availableModels.some(m => m.startsWith(selection.model.split(':')[0]))) {
            console.log('Warning: Model ' + selection.model + ' not available, using fallback');
            return MODEL_SELECTION.default;
        }
        
        return selection;
    }

    async analyzeEvent(event) {
        const category = event.category || 'conflict';
        const modelConfig = this.getModelForCategory(category);
        
        const prompt = `${modelConfig.prompt}

Analyze this event and provide structured intelligence:

EVENT:
- Title: ${event.type}
- Description: ${event.description}
- Source: ${event.source}
- Category: ${category}
- Location: ${event.lat}, ${event.lon}
- Date: ${event.date}

Provide your analysis in JSON format:
{
  "threatLevel": "Critical|High|Medium|Low|Info",
  "threatCategory": "Military|Cyber|Geopolitical|Natural|Humanitarian|Economic|Other",
  "keyIndicators": ["indicator1", "indicator2", "indicator3"],
  "affectedRegions": ["region1", "region2"],
  "sentiment": "Positive|Negative|Neutral",
  "escalationPotential": "High|Medium|Low",
  "summary": "2-3 sentence summary",
  "recommendedActions": ["action1", "action2"]
}`;

        try {
            const response = await axios.post(OLLAMA_BASE + '/chat', {
                model: modelConfig.model,
                messages: [
                    { role: 'system', content: modelConfig.prompt },
                    { role: 'user', content: prompt }
                ],
                stream: false
            });

            const content = response.data.message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                const result = {
                    ...event,
                    analysis,
                    modelUsed: modelConfig.model,
                    analyzedAt: new Date().toISOString()
                };
                
                // Store critical/high threats
                if (analysis.threatLevel === 'Critical' || analysis.threatLevel === 'High') {
                    this.analyzedEvents.set(event.id, result);
                    await this.saveData();
                }
                
                return result;
            }
            
            return null;
        } catch (error) {
            console.error('Error analyzing event:', error.message);
            return null;
        }
    }

    async fetchAllData() {
        try {
            const response = await axios.get(CONFLICT_GLOBE_API, { timeout: 60000 });
            return response.data;
        } catch (error) {
            console.error('Error fetching conflict data:', error.message);
            return null;
        }
    }

    async analyzeAllData() {
        console.log('Starting comprehensive data analysis...');
        
        const data = await this.fetchAllData();
        if (!data || !data.events) {
            console.log('No data available');
            return [];
        }

        const events = data.events;
        const categories = {};
        
        events.forEach(event => {
            const cat = event.category || 'unknown';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(event);
        });

        console.log('Found ' + events.length + ' events across ' + Object.keys(categories).length + ' categories');

        const analyzedResults = [];
        
        for (const [category, categoryEvents] of Object.entries(categories)) {
            const modelConfig = this.getModelForCategory(category);
            console.log('Analyzing ' + categoryEvents.length + ' ' + category + ' events with ' + modelConfig.model + '...');
            
            const eventsToAnalyze = categoryEvents.slice(0, 5);
            
            for (const event of eventsToAnalyze) {
                const analyzed = await this.analyzeEvent(event);
                if (analyzed) {
                    analyzedResults.push(analyzed);
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.log('Analyzed ' + analyzedResults.length + ' events');
        return analyzedResults;
    }

    getThreatSummary(analyzedEvents) {
        const summary = {
            total: analyzedEvents.length,
            byThreatLevel: {},
            byCategory: {},
            critical: [],
            high: [],
            escalationRisk: []
        };

        analyzedEvents.forEach(event => {
            const level = event.analysis?.threatLevel || 'Unknown';
            const cat = event.analysis?.threatCategory || 'Unknown';
            
            summary.byThreatLevel[level] = (summary.byThreatLevel[level] || 0) + 1;
            summary.byCategory[cat] = (summary.byCategory[cat] || 0) + 1;

            if (level === 'Critical') summary.critical.push(event);
            if (level === 'High') summary.high.push(event);
            if (event.analysis?.escalationPotential === 'High') summary.escalationRisk.push(event);
        });

        return summary;
    }

    async generateReport() {
        console.log('Generating comprehensive AI report...');
        
        const analyzedEvents = await this.analyzeAllData();
        const summary = this.getThreatSummary(analyzedEvents);

        const report = {
            id: 'report-' + Date.now(),
            timestamp: new Date().toISOString(),
            summary,
            topThreats: summary.critical.slice(0, 5).map(e => ({
                title: e.type,
                level: e.analysis?.threatLevel,
                category: e.analysis?.threatCategory,
                location: e.lat.toFixed(2) + ', ' + e.lon.toFixed(2)
            })),
            recommendations: this.generateRecommendations(summary)
        };

        return report;
    }

    generateRecommendations(summary) {
        const recommendations = [];
        
        if (summary.critical.length > 0) {
            recommendations.push('Immediate attention required: ' + summary.critical.length + ' critical threats detected');
        }
        
        if (summary.byCategory['Military']) {
            recommendations.push('Monitor military activity in conflict zones');
        }
        
        if (summary.byCategory['Cyber']) {
            recommendations.push('Review cyber threat indicators');
        }
        
        if (summary.escalationRisk.length > 2) {
            recommendations.push('High escalation potential detected - recommend increased monitoring');
        }
        
        if (summary.byCategory['Natural']) {
            recommendations.push('Natural disaster monitoring active');
        }
        
        return recommendations;
    }

    getStoredThreats() {
        return Array.from(this.analyzedEvents.values());
    }
}

module.exports = ConflictGlobeAI;
