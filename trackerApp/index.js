import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import BackgroundService from 'react-native-background-actions';

// Define the task here so it's registered globally
const veryIntensiveTask = async (taskDataArguments) => {
    const { delay } = taskDataArguments;
    await new Promise( async (resolve) => {
        for (let i = 0; BackgroundService.isRunning(); i++) {
            // This keeps the background connection alive
            await new Promise((pause) => setTimeout(pause, delay));
        }
    });
};

// This name 'TrackerBackground' MUST match the taskName in your App.tsx options
AppRegistry.registerComponent(appName, () => App);