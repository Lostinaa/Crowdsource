#!/bin/bash
# Start Laravel server accessible from network (for real devices)
# This binds to 0.0.0.0 instead of 127.0.0.1 to allow connections from mobile devices

echo "Starting Laravel server on 0.0.0.0:8000 (accessible from network)..."
echo "Your local IP address(es):"
hostname -I | awk '{for(i=1;i<=NF;i++) print "  - http://"$i":8000/api"}'
echo ""
echo "Use one of these URLs in your mobile app settings."
echo "Press Ctrl+C to stop the server."
echo ""

php artisan serve --host=0.0.0.0 --port=8000




