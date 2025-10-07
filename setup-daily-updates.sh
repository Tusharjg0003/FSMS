#!/bin/bash

# Daily Availability Window Update Script
# This script updates technician availability windows every day at 1 AM UTC

echo "Setting up daily availability window updates..."

# Create a simple cron job that calls the API endpoint
# This assumes your app is running on localhost:3000
# For production, replace with your actual domain

# Add to crontab (runs daily at 1 AM UTC)
(crontab -l 2>/dev/null; echo "0 1 * * * curl -X POST http://localhost:3000/api/cron/update-availability -H 'Authorization: Bearer YOUR_CRON_SECRET'") | crontab -

echo "✅ Cron job added!"
echo "The availability windows will be updated daily at 1 AM UTC"
echo ""
echo "To test manually, run:"
echo "curl -X GET http://localhost:3000/api/cron/update-availability"
echo ""
echo "For production deployment:"
echo "1. Set CRON_SECRET environment variable"
echo "2. Replace localhost:3000 with your production domain"
echo "3. Use your hosting platform's cron/scheduler service"
