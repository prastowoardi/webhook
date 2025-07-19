import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();
const server = createServer(app);
const io = new Server(server);
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let logs = [];

try {
  const fileLogs = fs.readFileSync('logs.json');
  logs = JSON.parse(fileLogs);
  console.log('✅ Loaded logs from logs.json');
} catch (err) {
  console.log('⚠️ No existing log file. Starting fresh.');
  logs = [];
}

function saveLogsToFile() {
  fs.writeFile('logs.json', JSON.stringify(logs, null, 2), err => {
    if (err) console.error('❌ Error saving logs:', err);
  });
}

app.post('/webhook', (req, res) => {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    'unknown';

  const logEntry = {
    timestamp: new Date().toISOString(),
    ip,
    body: req.body,
  };

  logs.push(logEntry);
  saveLogsToFile();

  console.log('📩 Webhook received:', logEntry);
  res.status(200).send('OK');

  io.emit('new_log', logEntry);
});

app.get('/logs', (req, res) => {
  res.json(logs);
});

io.on('connection', socket => {
  console.log('🔌 Client connected');
  socket.emit('init', logs);
});

server.listen(PORT, () => {
  console.log(`🚀 Webhook logger running on http://localhost:${PORT}`);
});
