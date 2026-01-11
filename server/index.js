const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dataFile = 'data.json';
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}));

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket']
});

const deviceSockets = {}; 

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    socket.on('register', (deviceId) => {
        if (!deviceSockets[deviceId]) deviceSockets[deviceId] = [];
        deviceSockets[deviceId].push(socket.id);
        console.log(`Device ${deviceId} registered.`);
    });

    socket.on('data', (data) => {
        const { deviceId, location, sms, storage } = data;
        const allData = JSON.parse(fs.readFileSync(dataFile));
        if (!allData[deviceId]) allData[deviceId] = [];
        
        allData[deviceId].push({ timestamp: new Date().toISOString(), location, sms, storage });
        fs.writeFileSync(dataFile, JSON.stringify(allData, null, 2));
        
        // Broadcast to dashboard
        io.emit('dataUpdate', allData);
    });

    socket.on('command', (data) => {
        const { deviceId, command } = data;
        if (deviceSockets[deviceId]) {
            deviceSockets[deviceId].forEach(sid => io.to(sid).emit('command', { deviceId, command }));
            console.log(`Sent command: ${command} to ${deviceId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id);
    });
});

app.get('/api/devices', (req, res) => {
    const allData = JSON.parse(fs.readFileSync(dataFile));
    res.json({ devices: Object.keys(allData) });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));