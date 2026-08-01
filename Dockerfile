FROM php:8.3-fpm

# Instala dependências do sistema e extensões PHP necessárias
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip

# Instala extensões PHP
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd xml dom

# Instala Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Define diretório de trabalho
WORKDIR /var/www

# Ajusta permissões
RUN chown -R www-data:www-data /var/www

USER www-data
