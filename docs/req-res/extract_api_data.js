const fs = require('fs');
const path = require('path');

const files = [
    'app.astroline-today-1-clean.har',
    'app.astroline-advisors-2-clean.har',
    'app.astroline-features-3-clean.har',
    'app.astroline-compatibility-4-clean.har',
    'app.astroline-birthchart-5-clean.har'
];

const reportPath = path.join(__dirname, 'api_audit_data.md');
let reportContent = '# API Audit Data Extraction\n\n';

files.forEach(file => {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        reportContent += `## File: ${file}\n\n`;

        // Group endpoints to avoid spamming the same endpoint multiple times
        const endpointMap = new Map();

        data.log.entries.forEach(e => {
            try {
                const url = new URL(e.request.url);
                // Ignore common firebase auth/config noise to focus on core API
                if (!url.hostname.includes('firebase') && !url.hostname.includes('googleapis') && !url.hostname.includes('sentry')) {
                    const endpoint = url.pathname;

                    // Only store if we have response content and we haven't seen this endpoint (or if it's a different method)
                    if (e.response && e.response.content && e.response.content.text) {
                        const key = `${e.request.method} ${endpoint}`;
                        if (!endpointMap.has(key)) {
                            try {
                                // Try to parse json to format it, otherwise keep as is
                                const jsonContent = JSON.parse(e.response.content.text);
                                endpointMap.set(key, {
                                    requestUrl: e.request.url,
                                    requestHeaders: e.request.headers.filter(h => h.name.toLowerCase() === 'authorization' || h.name.toLowerCase() === 'x-version'),
                                    postData: e.request.postData ? e.request.postData.text : null,
                                    responsePreview: JSON.stringify(jsonContent).substring(0, 500) + (JSON.stringify(jsonContent).length > 500 ? '...' : ''),
                                    fullResponse: jsonContent
                                });
                            } catch (err) {
                                // Not JSON, ignore or store minimal
                            }
                        }
                    }
                }
            } catch (err) { }
        });

        // Write out the summaries for this file
        for (const [key, info] of endpointMap.entries()) {
            reportContent += `### ${key}\n`;
            reportContent += `- **Full URL**: ${info.requestUrl}\n`;
            if (info.postData) {
                reportContent += `- **Request Payload Preview**: ${info.postData.substring(0, 100)}...\n`;
            }
            reportContent += `- **Response Preview**: \n\`\`\`json\n${info.responsePreview}\n\`\`\`\n\n`;
        }

    } catch (e) {
        console.error(`Error reading ${file}: ${e.message}`);
    }
});

fs.writeFileSync(reportPath, reportContent);
console.log(`Extraction complete. Report saved to ${reportPath}`);
