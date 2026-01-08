import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Chatbot from './Chatbot';

const SERVER = process.env.REACT_APP_SERVER_URL || window.location.origin;

function MapBounds({ devices }) {
  const map = useMap();
  useEffect(() => {
    const positions = Object.values(devices)
      .filter(d => d.online)
      .map(d => d.latest)
      .filter(Boolean)
      .map(loc => [loc.latitude, loc.longitude]);
    if (positions.length === 0) return;
    const bounds = positions.length === 1
      ? L.latLngBounds(positions[0], positions[0])
      : positions.reduce((bounds, pos) => bounds.extend(pos), L.latLngBounds(positions[0], positions[0]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [devices, map]);
  return null;
}

export default function App() {
  const [devices, setDevices] = useState({});
  const [selectedDevice, setSelectedDevice] = useState('');
  const [isChatbotVisible, setChatbotVisible] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(SERVER, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000
    });
    socketRef.current.on('connect', () => console.log('Connected to server'));
    socketRef.current.on('connect_error', (err) => console.log('Connection error:', err));
    socketRef.current.on('deviceLocation', ({ deviceId, payload }) => {
      setDevices(prev => ({ ...prev, [deviceId]: { ...(prev[deviceId] || {}), latest: payload, sms: prev[deviceId]?.sms || [], online: true } }));
    });
    socketRef.current.on('deviceSms', ({ deviceId, payload }) => {
      setDevices(prev => {
        const d = prev[deviceId] || { latest: null, sms: [], online: true };
        return { ...prev, [deviceId]: { ...d, sms: [payload, ...d.sms], online: true } };
      });
    });
    socketRef.current.on('deviceStorage', ({ deviceId, payload }) => {
      setDevices(prev => ({ ...prev, [deviceId]: { ...(prev[deviceId] || {}), storage: payload, online: true } }));
    });
    socketRef.current.on('deviceOffline', ({ deviceId }) => {
      setDevices(prev => {
        const updated = { ...prev };
        if (updated[deviceId]) {
          updated[deviceId].online = false;
        }
        return updated;
      });
    });
    fetch(`${SERVER}/api/devices`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then(data => {
      const obj = {};
      data.devices.forEach(d => obj[d.deviceId] = { latest: d.latest, sms: [], online: false });
      setDevices(obj);
    }).catch(err => console.log('Fetch error:', err));
    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    // Listen for disconnect events to mark devices offline
    if (!socketRef.current) return;
    socketRef.current.on('disconnect', () => {
      setDevices(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          updated[id].online = false;
        });
        return updated;
      });
    });
  }, []);

  // Get device options for select box
  const deviceOptions = Object.keys(devices).filter(id => devices[id].online);

  // Filter SMS log by selected device
  const smsLog = selectedDevice
    ? (devices[selectedDevice]?.sms || [])
    : deviceOptions.flatMap(id => devices[id]?.sms || []);

  // Send command to device
  const sendCommand = (deviceId, command) => {
    if (socketRef.current) {
      socketRef.current.emit('command', { deviceId, command });
      alert(`Command "${command}" sent to ${deviceId}`);
    } else {
      alert('Socket not connected');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: 300, padding: 12, borderRight: '1px solid #ddd', overflowY: 'auto' }}>
        <h3>Online Devices</h3>
        {Object.entries(devices).filter(([id, d]) => d.online).length === 0 ? (
          <div style={{ color: '#888', padding: 8 }}>No devices online</div>
        ) : (
          Object.entries(devices).filter(([id, d]) => d.online).map(([id, d]) => (
            <div key={id} style={{ marginBottom: 10, padding: 8, border: '1px solid #ccc', cursor: 'pointer', backgroundColor: selectedDevice === id ? '#e0e0e0' : '#fff' }} onClick={() => setSelectedDevice(selectedDevice === id ? '' : id)}>
              <div><strong>{id}</strong></div>
              {d.latest && <div>Lat: {d.latest.latitude.toFixed(4)}, Lon: {d.latest.longitude.toFixed(4)}</div>}
              <div>Last seen: {d.latest ? new Date(d.latest.ts).toLocaleString() : 'N/A'}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); sendCommand(id, 'open freeze'); }}
                  style={{ padding: '5px 10px', backgroundColor: '#ff8c00', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}
                >
                  Freeze
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); sendCommand(id, 'open unfreeze'); }}
                  style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}
                >
                  Unfreeze
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); sendCommand(id, 'open lock'); }}
                  style={{ padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 12 }}
                >
                  Lock
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ flex: 1 }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {Object.entries(devices).filter(([id, d]) => d.online && d.latest).map(([id, d]) => (
            <Marker key={id} position={[d.latest.latitude, d.latest.longitude]}>
              <Popup><div><strong>{id}</strong><br />{new Date(d.latest.ts).toLocaleString()}</div></Popup>
            </Marker>
          ))}
          <MapBounds devices={devices} />
        </MapContainer>
      </div>
      <div style={{ width: 360, padding: 12, borderLeft: '1px solid #ddd', overflowY: 'auto' }}>
        {selectedDevice && devices[selectedDevice] && (
          <div style={{ marginBottom: 20, padding: 12, border: '1px solid #ddd' }}>
            <h3>Device Info: {selectedDevice}</h3>
            <div><strong>Status:</strong> {devices[selectedDevice].online ? 'Online' : 'Offline'}</div>
            {devices[selectedDevice].latest && (
              <>
                <div><strong>Last Location:</strong> Lat {devices[selectedDevice].latest.latitude.toFixed(4)}, Lon {devices[selectedDevice].latest.longitude.toFixed(4)}</div>
                <div><strong>Last Seen:</strong> {new Date(devices[selectedDevice].latest.ts).toLocaleString()}</div>
              </>
            )}
            <div><strong>SMS Count:</strong> {devices[selectedDevice].sms.length}</div>
            {devices[selectedDevice].storage && (
              <div>
                <strong>Storage:</strong>
                Total: {(devices[selectedDevice].storage.total / (1024 * 1024 * 1024)).toFixed(2)} GB,
                Free: {(devices[selectedDevice].storage.free / (1024 * 1024 * 1024)).toFixed(2)} GB
              </div>
            )}
          </div>
        )}
        <h3>SMS Log</h3>
        {deviceOptions.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="deviceSelect">Show SMS for device:</label>
            <select id="deviceSelect" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} style={{ marginLeft: 8 }}>
              <option value="">All Online Devices</option>
              {deviceOptions.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
        )}
        {deviceOptions.length > 0 ? (
          smsLog.map((s, i) => (
            <div key={selectedDevice + '-' + i} style={{ marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
              <div><strong>{selectedDevice || s.deviceId}</strong> - {new Date(s.ts).toLocaleString()}</div>
              <div><strong>From:</strong> {s.from}</div>
              <div>{s.text}</div>
            </div>
          ))
        ) : (
          <div style={{ color: '#888' }}>No devices online. No SMS to display.</div>
        )}
      </div>
      <button
        onClick={() => setChatbotVisible(!isChatbotVisible)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          padding: '10px 20px',
          borderRadius: 5,
          border: 'none',
          backgroundColor: '#007bff',
          color: 'white',
          cursor: 'pointer',
          zIndex: 1001,
        }}
      >
        {isChatbotVisible ? 'Close Chat' : 'Open Chat'}
      </button>
      <Chatbot
        socket={socketRef.current}
        visible={isChatbotVisible}
        onClose={() => setChatbotVisible(false)}
        selectedDevice={selectedDevice}
      />
    </div>
  );
}
