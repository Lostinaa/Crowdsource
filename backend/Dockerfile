FROM php:8.4-fpm-alpine

# Install system dependencies and PHP extensions in a single layer
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    oniguruma-dev \
    libzip-dev \
    postgresql-dev \
    icu-dev \
    libsodium-dev \
    nodejs \
    npm \
    && docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl \
    sodium \
    && rm -rf /var/cache/apk/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working dir
WORKDIR /var/www/html

# Copy all Laravel files
COPY . .

# Give ownership to www-data
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Install vendor
RUN composer install --no-dev --optimize-autoloader

# Install frontend dependencies and build assets (for Filament/Vite)
RUN if [ -f package.json ]; then npm ci --only=production && npm run build; fi

# Expose PHP-FPM port
EXPOSE 9000

# Start PHP-FPM server
CMD ["php-fpm"]

