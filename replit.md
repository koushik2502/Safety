# Device Tracker System

## Overview
A real-time device tracking system with location monitoring and SMS logging capabilities, consisting of a React dashboard frontend and Node.js backend with Socket.IO for real-time communication.

## Project Architecture
- **Backend Server** (`server/`): Node.js + Express + Socket.IO (Port 8000)
- **Frontend Dashboard** (`dashboard/`): React + Leaflet maps + Socket.IO client (Port 5000)
- **Mobile Apps** (`trackerApp/`): React Native apps (not configured for Replit)

## Current Configuration
- Backend runs on port 8000 with host 0.0.0.0
- Frontend runs on port 5000 with HTTPS enabled
- Frontend configured with host checking disabled for Replit proxy
- Uses in-memory storage (can be upgraded to PostgreSQL)

## Recent Changes (2025-09-25)
- ✅ Installed Node.js dependencies for both frontend and backend
- ✅ Updated server to use environment variables and proper host binding
- ✅ Configured React app for Replit environment with HTTPS
- ✅ Set up proper workflows for both frontend and backend
- ✅ Configured deployment settings for production

## API Endpoints
- `POST /api/update` - Receive device location/SMS updates
- `GET /api/devices` - Get list of tracked devices

## Real-time Features
- Device location tracking with live map updates
- SMS message logging and display
- Socket.IO for real-time communication

## Environment Variables
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)
- `REACT_APP_SERVER_URL` - Backend URL for frontend connection

## User Preferences
- Prefers React for frontend development
- Uses Socket.IO for real-time features
- Leaflet for mapping functionality