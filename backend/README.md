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
   php artisan serve
   ```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/metrics` - Submit QoE metrics
- `GET /api/metrics` - Get metrics (with filters)
- `GET /api/analytics/overview` - Analytics overview
- `POST /api/auth/login` - User authentication
- `GET /api/auth/user` - Get current user

## Frontend Configuration

Update your React Native app's backend URL:
- Development: `http://localhost:8000/api`
- Production: `https://your-domain.com/api`

