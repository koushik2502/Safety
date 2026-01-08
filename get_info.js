const os = require('os');
const http = require('http');

// Get IPs
const interfaces = os.networkInterfaces();
console.log('--- IPs ---');
for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
            console.log(iface.address);
        }
    }
}

// Get Ngrok
http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.tunnels && json.tunnels.length > 0) {
                console.log('--- Ngrok ---');
                console.log(json.tunnels[0].public_url);
            } else {
                console.log('--- Ngrok ---');
                console.log('No tunnels');
            }
        } catch (e) {
            console.log('Error parsing ngrok data');
        }
    });
}).on('error', () => console.log('Ngrok API not accessible'));
