full_system package
-------------------
Folders:
- server/    : Node.js backend (run on your PC)
- dashboard/ : React dashboard (run in browser)
- trackerApp/: React Native bare app skeleton (Android native code included)

Steps (quick):
1. Edit files and replace <YOUR_PC_IP> with your PC's LAN IP in trackerApp and dashboard.
2. Start server: cd server && npm install && node index.js
3. Start dashboard: cd dashboard && npm install && npm start
4. Build and run Android app: cd trackerApp && npm install && npx react-native run-android
