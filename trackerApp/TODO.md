# TODO for Fixing Android Build Error

## Steps to Complete:

1. [x] Edit `trackerApp/android/gradle.properties`:
   - Increase JVM heap size from -Xmx2g to -Xmx4g
   - Disable Jetifier by setting android.enableJetifier=false

2. [x] Clean the project: Run `./gradlew clean` from `trackerApp/android` directory.

3. [ ] Fix minSdkVersion: Update `trackerApp/android/app/build.gradle` to set minSdkVersion to 24 (required by React Native 0.81.4)

4. [ ] Test build: Run `./gradlew assembleDebug` from `trackerApp/android` directory.

5. [ ] If build succeeds, test run: Execute `npx react-native run-android` from project root (trackerApp).

## Notes:
- After each step, update this TODO.md by marking as [x] when complete.
- If issues persist, check RN version with `npx react-native --version` and provide output.
