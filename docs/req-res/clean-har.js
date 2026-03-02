const fs = require('fs');

const inputFile = process.argv[2] || 'C:\\Purple Roses Technology\\SaaS Projects\\Astro-AI\\astro-ai-repo\\docs\\req-res\\app.astroline-today-1.har';
const outputFile = process.argv[3] || 'C:\\Purple Roses Technology\\SaaS Projects\\Astro-AI\\astro-ai-repo\\docs\\req-res\\app.astroline-today-1-clean.har';

console.log(`Reading from: ${inputFile}`);
const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

// Filter entries
const blockedDomains = [
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net', 'facebook.net',
  'facebook.com', 'sentry.io', 'hotjar.com', 'mixpanel.com', 'amplitude.com',
  'bugsnag.com', 'clarity.ms', 'posthog.com', 'segment.com', 'firebaseio.com',
  'firebaselogging-pa.googleapis.com', 'play.google.com', 'fonts.googleapis.com', 
  'fonts.gstatic.com', 'cloudflareinsights.com', 'google.com' // e.g., firebase config
];

const blockedMimeTypes = ['image/', 'font/', 'text/css', 'audio/', 'video/'];
const blockedExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];

if (data.log && data.log.entries) {
  const originalCount = data.log.entries.length;
  data.log.entries = data.log.entries.filter(entry => {
    // Filter by domain
    try {
      const url = new URL(entry.request.url);
      if (blockedDomains.some(d => url.hostname.includes(d))) return false;
    } catch(e) {}

    // Filter by options request
    if (entry.request.method === 'OPTIONS') return false;

    // Filter by mimetype
    const mimeType = entry.response?.content?.mimeType || '';
    if (blockedMimeTypes.some(m => mimeType.includes(m))) return false;
    
    // Filter by extension or static files
    if (blockedExtensions.some(ext => entry.request.url.includes(ext))) return false;
    
    return true;
  });

  // Clean remaining entries
  data.log.entries.forEach(entry => {
    // Delete noisy properties
    delete entry._initiator;
    delete entry._priority;
    delete entry._resourceType;
    delete entry.time;
    delete entry.timings;
    delete entry.connection;
    delete entry.pageref;
    delete entry.serverIPAddress;
    
    // Clean headers
    const keepHeaders = ['content-type', 'authorization', 'x-api-key', 'origin', 'referer', 'x-version', 'x-platform'];
    if (entry.request?.headers) {
      entry.request.headers = entry.request.headers.filter(h => keepHeaders.includes(h.name.toLowerCase()));
    }
    if (entry.response?.headers) {
      entry.response.headers = entry.response.headers.filter(h => keepHeaders.includes(h.name.toLowerCase()));
    }
    
    // Delete cookies (usually redundant for API analysis if token is in header, or we can just empty them)
    if (entry.request) {
      delete entry.request.cookies;
      delete entry.request.headersSize;
    }
    if (entry.response) {
      delete entry.response.cookies;
      delete entry.response.headersSize;
      delete entry.response._transferSize;
      delete entry.response._error;
      delete entry.response._fetchedViaServiceWorker;
    }

    // Keep response text ONLY if it is json or graphql or text/html
    if (entry.response?.content) {
      const mime = entry.response.content.mimeType || '';
      if (!mime.includes('json') && !mime.includes('xml') && !mime.includes('graphql') && !mime.includes('text/html')) {
        delete entry.response.content.text;
      }
    }
  });
  
  console.log(`Entries reduced from ${originalCount} to ${data.log.entries.length}`);
}

fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
console.log(`Cleaned HAR saved to ${outputFile}`);
