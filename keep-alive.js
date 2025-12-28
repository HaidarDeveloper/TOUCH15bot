// keep-alive.js
const http = require('http');
const axios = require('axios');

// Server untuk external pinging
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    bot: 'TOUCH15 WhatsApp Bot',
    time: new Date().toISOString(),
    uptime: process.uptime()
  }));
});

server.listen(8080, () => {
  console.log('🔄 Keep-alive server listening on port 8080');
});

// Auto ping sendiri setiap 14 menit (Replit mati setelah 15 menit idle)
setInterval(async () => {
  try {
    const response = await axios.get('http://localhost:8080');
    console.log(`✅ Keep-alive ping successful: ${response.status}`);
  } catch (error) {
    console.log('⚠️ Keep-alive ping failed:', error.message);
  }
}, 14 * 60 * 1000); // 14 menit

console.log('🔄 Keep-alive system started');
