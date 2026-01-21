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

# Start server
cd public
php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
```

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



