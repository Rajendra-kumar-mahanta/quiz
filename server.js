const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Tuned for 120+ simultaneous concurrent connections & low latency
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 10000,
    maxHttpBufferSize: 1e6, // 1MB payload
    connectTimeout: 45000,
    perMessageDeflate: {
      threshold: 1024 // Only compress payloads larger than 1KB to save CPU
    }
  });

  const { setupSocketServer } = require('./server-socket-helper.js');
  setupSocketServer(io);

  // Attach io to global object for API routes access
  global.io = io;

  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }

  server.listen(port, hostname, () => {
    console.log(`\n======================================================`);
    console.log(`⚡ ROBOQUEST LIVE COMPETITION SERVER:`);
    console.log(`   ➜ Local:   http://localhost:${port}`);
    console.log(`   ➜ Network: http://${localIP}:${port}`);
    console.log(`🔌 Real-time WebSockets active (Tuned for 120+ concurrent users)`);
    console.log(`======================================================\n`);
  });
});
