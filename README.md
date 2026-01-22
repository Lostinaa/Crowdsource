# Crowdsourcing QoE Measurement Platform

Full-stack platform for crowdsourcing Quality of Experience (QoE) measurements from mobile devices.

## Project Structure

- **`backend/`** - Laravel API backend with Filament admin dashboard
- **`Crowdsource/`** - React Native/Expo mobile application

## Quick Start

### Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate

# Start PostgreSQL (Docker)
docker start qoe-postgres

# Start server (accessible from network for real devices)
# Option 1: Use the convenience script
./start-server.sh

# Option 2: Use artisan serve directly
php artisan serve --host=0.0.0.0 --port=8000

# Option 3: Use PHP built-in server
cd public
php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
```

**Important for Real Device Connection:**
- The server must bind to `0.0.0.0` (not `127.0.0.1`) to accept connections from mobile devices
- Find your machine's IP address: `hostname -I` (Linux) or `ipconfig getifaddr en0` (Mac)
- Update the backend URL in the mobile app settings to: `http://YOUR_IP:8000/api`
- Example: If your IP is `172.25.210.174`, use `http://172.25.210.174:8000/api`

Access admin dashboard at `http://localhost:8000/admin`
- Default admin: `admin@qoe.local` / `admin123456`

### Mobile App Setup

```bash
cd Crowdsource
npm install
npm start
```

## Features

- **Mobile App**: Collects QoE metrics (voice calls, data throughput, latency, etc.)
- **Backend API**: Receives and stores metrics in PostgreSQL
- **Admin Dashboard**: Filament-based dashboard for viewing and analyzing metrics
- **Real-time Analytics**: Charts and statistics for QoE trends

## Tech Stack

- **Backend**: Laravel 12, Filament 3, PostgreSQL
- **Mobile**: React Native, Expo, TypeScript
- **Infrastructure**: Docker (PostgreSQL)




