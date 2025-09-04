# Google Maps Integration Setup

This document explains how to set up Google Maps integration for the Field Service Management System (FSMS) technician location tracking.

## Prerequisites

1. A Google Cloud Platform account
2. A Google Maps API key with the necessary APIs enabled

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Required APIs

Enable the following APIs in your Google Cloud project:

1. **Maps JavaScript API** - Required for displaying the map
2. **Places API** - Optional, for enhanced location features
3. **Geocoding API** - Optional, for address lookup

To enable APIs:
1. Go to "APIs & Services" > "Library"
2. Search for each API and click "Enable"

## Step 3: Create an API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. (Recommended) Restrict the API key to your domain for security

## Step 4: Configure Environment Variables

Create a `.env.local` file in your project root with the following content:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with your actual Google Maps API key.

## Step 5: API Key Security (Recommended)

For production environments, restrict your API key:

1. In the Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click on your API key
3. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domain(s): `yourdomain.com/*`
4. Under "API restrictions":
   - Select "Restrict key"
   - Choose only the APIs you need (Maps JavaScript API, etc.)

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to the admin technician locations page
3. You should see a Google Maps interface instead of the custom CSS map
4. Technicians should appear as markers on the map

## Features

The Google Maps integration provides:

- **Real-time technician tracking** with custom markers
- **Interactive map controls** (zoom, fit bounds)
- **Info windows** with technician details
- **Status indicators** (green for on-job, blue for available)
- **Click-to-view** technician details
- **Auto-refresh** every 30 seconds
- **Responsive design** for mobile and desktop

## Troubleshooting

### Map Not Loading
- Check that your API key is correct
- Verify that the Maps JavaScript API is enabled
- Check browser console for error messages
- Ensure your domain is allowed (if restrictions are set)

### Markers Not Appearing
- Verify that technicians have location data
- Check the API endpoint `/api/admin/technician-locations`
- Ensure location tracking is working for technicians

### API Quota Exceeded
- Check your Google Cloud Console for quota usage
- Consider implementing request caching
- Review your API key restrictions

## Cost Considerations

Google Maps API usage is billed based on:
- Map loads
- API requests
- Data usage

Monitor your usage in the Google Cloud Console to avoid unexpected charges.

## Support

For issues with the Google Maps integration:
1. Check the browser console for errors
2. Verify API key configuration
3. Review Google Maps API documentation
4. Check Google Cloud Console for quota and billing issues
