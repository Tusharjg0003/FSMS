# Location Tracking System for Field Service Management System

## Overview

This document describes the implementation of a comprehensive location tracking system for technicians in the Field Service Management System (FSMS). The system provides real-time GPS tracking, location history, and administrative monitoring capabilities.

## Features

### For Technicians
- **Real-time GPS tracking** with automatic location updates
- **Manual location updates** for immediate positioning
- **Location history** tracking with timestamps and accuracy data
- **Job association** - locations can be linked to specific jobs
- **GPS accuracy indicators** and speed/heading data
- **Google Maps integration** for easy location viewing

### For Administrators & Supervisors
- **Real-time technician monitoring** with live location updates
- **Interactive map visualization** showing all technician positions
- **Location history** for audit trails and performance analysis
- **Job status integration** - see which technicians are on active jobs
- **Distance calculations** and geographic analytics
- **Responsive dashboard** with auto-refresh capabilities

## Technical Implementation

### Database Schema

The system extends the existing Prisma schema with new models:

```prisma
model User {
  // ... existing fields ...
  
  // Location tracking fields
  currentLatitude Float?
  currentLongitude Float?
  lastLocationUpdate DateTime?
  locationHistory LocationHistory[]
}

model LocationHistory {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  latitude  Float
  longitude Float
  timestamp DateTime @default(now())
  accuracy  Float?   // GPS accuracy in meters
  speed     Float?   // Speed in m/s
  heading   Float?   // Direction in degrees
  jobId     Int?     // Associated job if any
  job       Job?     @relation(fields: [jobId], references: [id])
}
```

### API Endpoints

#### Technician Location API (`/api/technician/location`)
- **POST**: Update current location
- **GET**: Retrieve current location and history

#### Admin Technician Locations API (`/api/admin/technician-locations`)
- **GET**: Retrieve all technicians' current locations (admin/supervisor only)

### Components

#### LocationTracker (`src/components/LocationTracker.tsx`)
- Handles GPS permissions and location acquisition
- Manages continuous tracking with configurable intervals
- Provides manual update capabilities
- Displays current location and accuracy information
- Shows location history with job associations

#### TechnicianMap (`src/components/TechnicianMap.tsx`)
- Visualizes all technician locations on an interactive map
- Provides real-time updates with configurable refresh intervals
- Shows technician details, job status, and location history
- Includes distance calculations and geographic analytics

## Usage

### For Technicians

1. **Access Location Tracking**
   - Navigate to `/technician/profile` or `/technician/jobs`
   - The LocationTracker component will be displayed

2. **Start Tracking**
   - Click "Start Tracking" to begin automatic GPS updates
   - The system will request GPS permissions if not already granted
   - Location updates occur automatically every 30 seconds

3. **Manual Updates**
   - Click "Update Now" for immediate location refresh
   - Useful when starting a new job or arriving at a location

4. **View History**
   - Location history is displayed below current location
   - Shows timestamps, coordinates, and associated jobs
   - Click "View on Google Maps" to see location on external map

### For Administrators & Supervisors

1. **Access Location Dashboard**
   - Navigate to `/admin/technician-locations`
   - Available to users with ADMIN or SUPERVISOR roles

2. **Monitor Technicians**
   - View real-time locations of all technicians
   - See which technicians are on active jobs
   - Monitor location accuracy and update frequency

3. **Interactive Map**
   - Click on technician markers for detailed information
   - Zoom in/out for better geographic context
   - View distance calculations from map center

4. **Location History**
   - Enable history tracking for detailed audit trails
   - Analyze technician movement patterns
   - Track job-related location data

## Security & Privacy

### Role-Based Access Control
- **Technicians**: Can only view and update their own location
- **Supervisors**: Can view all technician locations
- **Administrators**: Full access to location data and history

### Data Protection
- GPS coordinates are stored securely in the database
- Location history is retained for audit purposes
- No location data is shared with unauthorized users

### GPS Permissions
- System requests GPS permissions from the browser
- Users can deny or revoke permissions at any time
- Fallback mechanisms for when GPS is unavailable

## Configuration

### Auto-Tracking Settings
- **Default refresh interval**: 30 seconds
- **GPS accuracy**: High accuracy mode enabled
- **Maximum age**: 1 minute for location data
- **Timeout**: 10 seconds for GPS requests

### Map Display Settings
- **Auto-refresh**: Configurable intervals (default: 30s)
- **History display**: Optional location history
- **Zoom levels**: 1x to 20x magnification
- **Center calculation**: Automatic based on technician positions

## Performance Considerations

### Database Optimization
- Location history is indexed by timestamp and user ID
- Automatic cleanup of old location data (configurable)
- Efficient queries for real-time location updates

### Real-Time Updates
- WebSocket-like behavior using polling
- Configurable refresh intervals to balance accuracy vs. performance
- Background location updates when app is not visible

### Mobile Optimization
- Responsive design for mobile devices
- Battery-efficient GPS usage
- Offline capability for location storage

## Troubleshooting

### Common Issues

1. **GPS Not Working**
   - Check browser permissions for location access
   - Ensure device GPS is enabled
   - Try refreshing the page and granting permissions again

2. **Location Not Updating**
   - Verify internet connection
   - Check if tracking is started
   - Ensure GPS permissions are granted

3. **Inaccurate Locations**
   - Wait for GPS to acquire better signal
   - Check GPS accuracy indicator
   - Consider environmental factors (buildings, tunnels, etc.)

4. **Admin Dashboard Not Loading**
   - Verify user has ADMIN or SUPERVISOR role
   - Check browser console for errors
   - Ensure API endpoints are accessible

### Debug Information

The system provides detailed logging for troubleshooting:
- GPS permission status
- Location update frequency
- API response times
- Error messages and stack traces

## Future Enhancements

### Planned Features
- **Geofencing**: Automatic notifications when technicians enter/exit job areas
- **Route optimization**: Suggest optimal routes between job locations
- **Offline support**: Store locations locally when internet is unavailable
- **Battery optimization**: Adaptive tracking based on device battery level
- **Integration**: Connect with external mapping services (Google Maps API, etc.)

### Scalability Improvements
- **Real-time updates**: WebSocket implementation for instant location sharing
- **Caching**: Redis-based caching for improved performance
- **Analytics**: Advanced reporting and location analytics
- **Mobile app**: Native mobile applications for better GPS performance

## Support

For technical support or questions about the location tracking system:
- Check the application logs for error details
- Verify GPS permissions and device settings
- Ensure proper role assignments for admin access
- Contact system administrators for database or API issues

---

*This location tracking system is designed to improve field service efficiency while maintaining security and privacy standards.*
