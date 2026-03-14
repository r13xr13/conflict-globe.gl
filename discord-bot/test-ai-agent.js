const ConflictGlobeAI = require('./ai-agent');

async function test() {
    const ai = new ConflictGlobeAI();
    await ai.init();
    
    console.log('\n🔍 Fetching all data from Conflict Globe...');
    const data = await ai.fetchAllData();
    
    if (data && data.events) {
        console.log(`Found ${data.events.length} events`);
        
        // Group by category
        const categories = {};
        data.events.forEach(e => {
            const cat = e.category || 'unknown';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        
        console.log('\n📊 Events by category:');
        Object.entries(categories).forEach(([cat, count]) => {
            console.log(`   ${cat}: ${count}`);
        });
        
        // Test analysis on a few events
        console.log('\n🧪 Testing AI analysis on sample events...');
        
        // Test conflict event
        const conflictEvent = data.events.find(e => e.category === 'conflict');
        if (conflictEvent) {
            console.log('\n📁 Analyzing conflict event:');
            console.log(`   Title: ${conflictEvent.type}`);
            const result = await ai.analyzeEvent(conflictEvent);
            if (result && result.analysis) {
                console.log(`   Threat Level: ${result.analysis.threatLevel}`);
                console.log(`   Category: ${result.analysis.threatCategory}`);
                console.log(`   Summary: ${result.analysis.summary}`);
                console.log(`   Model Used: ${result.modelUsed}`);
            }
        }
        
        // Test cyber event
        const cyberEvent = data.events.find(e => e.category === 'cyber');
        if (cyberEvent) {
            console.log('\n📁 Analyzing cyber event:');
            console.log(`   Title: ${cyberEvent.type}`);
            const result = await ai.analyzeEvent(cyberEvent);
            if (result && result.analysis) {
                console.log(`   Threat Level: ${result.analysis.threatLevel}`);
                console.log(`   Category: ${result.analysis.threatCategory}`);
                console.log(`   Summary: ${result.analysis.summary}`);
                console.log(`   Model Used: ${result.modelUsed}`);
            }
        }
        
        console.log('\n✅ AI Agent test completed!');
    } else {
        console.log('❌ No data available');
    }
}

test().catch(console.error);
