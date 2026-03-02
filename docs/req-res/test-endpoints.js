const fs = require('fs');

const files = [
    'app.astroline-today-1-clean.har',
    'app.astroline-advisors-2-clean.har',
    'app.astroline-features-3-clean.har',
    'app.astroline-compatibility-4-clean.har',
    'app.astroline-birthchart-5-clean.har'
];

files.forEach(file => {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const urls = new Set();
        data.log.entries.forEach(e => {
            try {
                const url = new URL(e.request.url);
                // Ignore common firebase auth/config noise to focus on core API
                if (!url.hostname.includes('firebase') && !url.hostname.includes('googleapis')) {
                    urls.add(url.pathname);
                }
            } catch (err) { }
        });
        console.log(`\nFile: ${file}`);
        console.log(`Unique Endpoints (${urls.size}):`);
        const sortedUrls = Array.from(urls).sort();
        console.log(sortedUrls.slice(0, 5).join('\n'));
        if (sortedUrls.length > 5) {
            console.log(`... and ${sortedUrls.length - 5} more`);
        }
    } catch (e) {
        console.error(`Error reading ${file}: ${e.message}`);
    }
});
