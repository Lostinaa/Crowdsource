# Crowdsourcing QoE Backend API
## Laravel Backend for QoE Measurement App

This is the Laravel backend API for the Crowdsourcing QoE Measurement mobile application.

## Quick Start

**🚀 For fastest setup, use the automated setup script:**

```bash
cd backend
./setup.sh
```

Then follow the on-screen instructions. See [QUICK_START.md](./QUICK_START.md) for detailed guide.

## Manual Setup

If you prefer manual setup:

1. **Install Laravel** (if not already installed):
   ```bash
   composer create-project laravel/laravel qoe-backend
   cd qoe-backend
   ```

2. **Copy these files** to your Laravel project:
   - `routes/api.php` → `routes/api.php`
   - `app/Http/Controllers/` → `app/Http/Controllers/`
   - `app/Models/` → `app/Models/`
   - `database/migrations/` → `database/migrations/`
   - `config/cors.php` → `config/cors.php`

3. **Install dependencies**:
   ```bash
   composer require laravel/sanctum
   php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
   ```

4. **Ensure User model has HasApiTokens trait:**
   ```bash
   php ensure-user-model.php
   ```
   Or manually edit `app/Models/User.php` to include `Laravel\Sanctum\HasApiTokens` trait.

5. **Configure database** in `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=qoe_db
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   ```

6. **Run migrations**:
   ```bash
   php artisan migrate
   ```

7. **Generate API key**:
   ```bash
   php artisan key:generate
   ```

8. **Start server**:
   ```bash
   # For emulator/development (localhost only)
   php artisan serve
   
   # For real devices (network accessible)
   php artisan serve --host=0.0.0.0 --port=8000
   # Or use the convenience script:
   ./start-server.sh
   ```

**Important for Real Device Connection:**
- Use `--host=0.0.0.0` to bind to all network interfaces
- Find your machine's IP: `hostname -I` (Linux) or `ipconfig getifaddr en0` (Mac)
- Update mobile app backend URL to: `http://YOUR_IP:8000/api`
- Ensure both device and computer are on the same network

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/metrics` - Submit QoE metrics
- `GET /api/metrics` - Get metrics (with filters)
- `GET /api/analytics/overview` - Analytics overview
- `POST /api/auth/login` - User authentication
- `GET /api/auth/user` - Get current user

## Frontend Configuration

Update your React Native app's backend URL:
- **Emulator**: `http://localhost:8000/api` or `http://10.0.2.2:8000/api` (Android emulator)
- **Real Device**: `http://YOUR_COMPUTER_IP:8000/api` (e.g., `http://172.25.210.174:8000/api`)
- **Production**: `https://your-domain.com/api`

You can configure this in the app's Settings screen under "Backend Sync" section.

