const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');

// 1. Add banquetLeads array
if (!serverJs.includes('let banquetLeads = [')) {
    serverJs = serverJs.replace(
        'let orderCounter = 1003;',
        'let orderCounter = 1003;\n\nlet banquetLeads = [\n  {\n    id: "lead-1",\n    eventType: "Wedding",\n    guests: 500,\n    date: "2026-11-15",\n    venue: "Grand Elizey",\n    foodPref: "Vegetarian",\n    name: "Rahul Verma",\n    phone: "+91 9876543210",\n    email: "rahul@example.com",\n    status: "new",\n    createdAt: new Date().toISOString()\n  }\n];'
    );
}

// 2. Add to INIT_SYNC
if (!serverJs.includes('banquetLeads: banquetLeads')) {
    serverJs = serverJs.replace(
        'serviceRequests: serviceRequests,',
        'serviceRequests: serviceRequests,\n      banquetLeads: banquetLeads,'
    );
}

// 3. Add SUBMIT_BANQUET_LEAD case
if (!serverJs.includes('case \'SUBMIT_BANQUET_LEAD\':')) {
    const caseString = `
    case 'SUBMIT_BANQUET_LEAD': {
      const { lead } = data;
      const newLead = {
        id: \`lead-\${Date.now()}\`,
        ...lead,
        status: 'new',
        createdAt: new Date().toISOString()
      };
      banquetLeads.unshift(newLead);
      broadcast({
        type: 'NEW_BANQUET_LEAD',
        lead: newLead
      });
      break;
    }
`;
    // Find the end of REQUEST_SERVICE or something to insert after
    serverJs = serverJs.replace(
        "case 'RESOLVE_SERVICE': {",
        caseString + "\n    case 'RESOLVE_SERVICE': {"
    );
}

// 4. Update Stats API to include banquet leads
if (!serverJs.includes('banquetLeads.length')) {
    serverJs = serverJs.replace(
        /res\.json\(\{[\s\S]*?totalRevenue[\s\S]*?\}\);/,
        `res.json({
      orders: orders.length,
      completedOrders: completedOrders.length,
      activeOrders: orders.length - completedOrders.length,
      totalRevenue,
      serviceRequests: serviceRequests.length,
      banquetLeads: banquetLeads.length,
      averageResponseTime: "8 mins"
    });`
    );
}

fs.writeFileSync('server.js', serverJs);
console.log("Server logic updated for Banquets & Stats.");
