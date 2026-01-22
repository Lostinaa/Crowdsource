#!/bin/bash
# Start Laravel server for Android emulator
# Emulator uses 10.0.2.2 to access host's localhost

echo "Starting Laravel server for Android emulator..."
echo "The emulator will access this server at: http://10.0.2.2:8000/api"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

# For emulator, we can bind to localhost (127.0.0.1) since emulator uses 10.0.2.2
php artisan serve --host=127.0.0.1 --port=8000
