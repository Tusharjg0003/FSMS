# Daily Availability Window Updates

This system automatically updates technician availability windows every day to maintain a rolling 3-week schedule.

## How It Works

- **Every day at 1 AM UTC**, the system updates all technician availability windows
- **Rolls forward** the 21-day window (always 3 weeks ahead from today)
- **Maintains 8 AM - 8 PM UTC** availability for each technician
- **Automatically includes** any newly registered technicians

## Setup Options

### Option 1: Local Development (macOS/Linux)
```bash
# Run the setup script
./setup-daily-updates.sh

# Test manually
curl -X GET http://localhost:3000/api/cron/update-availability
```

### Option 2: Production Deployment

#### Vercel
1. Add environment variable: `CRON_SECRET=your-secret-key`
2. Use Vercel Cron Jobs:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/update-availability",
         "schedule": "0 1 * * *"
       }
     ]
   }
   ```

#### Railway
1. Add environment variable: `CRON_SECRET=your-secret-key`
2. Use Railway Cron:
   ```bash
   railway cron add "0 1 * * *" "curl -X POST https://your-app.railway.app/api/cron/update-availability -H 'Authorization: Bearer your-secret-key'"
   ```

#### DigitalOcean App Platform
1. Add environment variable: `CRON_SECRET=your-secret-key`
2. Use App Platform Cron Jobs in your app spec

#### Self-hosted (VPS/Server)
```bash
# Add to crontab
crontab -e

# Add this line:
0 1 * * * curl -X POST https://your-domain.com/api/cron/update-availability -H 'Authorization: Bearer YOUR_CRON_SECRET'
```

## Manual Testing

### Test the Update Endpoint
```bash
# As admin (requires login)
curl -X GET http://localhost:3000/api/cron/update-availability

# With API key (for production)
curl -X POST http://localhost:3000/api/cron/update-availability \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'
```

### Check Current Windows
```bash
# Check how many windows exist
curl -X GET http://localhost:3000/api/admin/technicians/extend-availability
```

## What Happens Daily

1. **1 AM UTC**: Cron job triggers
2. **System fetches** all technicians
3. **Creates 21 new windows** (today + 20 days ahead)
4. **Replaces old windows** with new ones
5. **Maintains rolling schedule** - always 3 weeks ahead

## Benefits

- ✅ **Always current**: Technicians always have 3 weeks of availability
- ✅ **Automatic**: No manual intervention needed
- ✅ **Includes new techs**: Newly registered technicians get windows automatically
- ✅ **Consistent**: Same schedule (8 AM - 8 PM UTC) every day
- ✅ **Scalable**: Works with any number of technicians

## Monitoring

Check the logs for successful updates:
- Look for "Updated availability windows for X technicians"
- Verify the date range is always 3 weeks ahead
- Monitor for any errors in the cron job execution
