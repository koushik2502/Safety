import React, { useEffect } from 'react';
import { View, Text, NativeModules, StyleSheet } from 'react-native';
import io from 'socket.io-client';

const { LockModule } = NativeModules;

// 1. UPDATE THIS TO YOUR CURRENT NGROK HTTPS URL
const SERVER_URL = 'https://your-ngrok-id.ngrok-free.dev';

function App(): React.JSX.Element {
  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to command center');
      // Identify this device to the dashboard
      socket.emit('dataUpdate', {
        deviceId: 'MOBILE_NODE_01', 
        location: { lat: 17.385, lon: 78.486 },
      });
    });

    // 2. LISTEN FOR REMOTE COMMANDS
    socket.on('executeCommand', (data: any) => {
      if (data.action === 'openApp') {
        // Calls the openTargetApp function in LockModule.kt
        LockModule.openTargetApp(data.targetApp);
      } else if (data.action === 'freeze') {
        LockModule.lockScreen();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.terminal}>
        <Text style={styles.text}>&gt; SYSTEM_ONLINE</Text>
        <Text style={styles.subText}>&gt; TUNNEL: {SERVER_URL}</Text>
        <Text style={styles.subText}>&gt; LISTENING_FOR_COMMANDS...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    padding: 20,
  },
  terminal: {
    borderWidth: 1,
    borderColor: '#00ff41',
    padding: 15,
  },
  text: {
    color: '#00ff41',
    fontFamily: 'monospace',
    fontSize: 18,
  },
  subText: {
    color: '#008f11',
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 10,
  },
});

export default App;