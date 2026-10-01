#!/bin/bash
# Script simples para executar migrations em produção
# Uso: ./deploy-migrate-simple.sh

set -e

if [ ! -f "artisan" ]; then
    echo "❌ Execute na raiz do projeto Laravel"
    exit 1
fi

echo "🔄 Executando migrations..."
php artisan migrate --force

echo "✅ Concluído"
php artisan migrate:status