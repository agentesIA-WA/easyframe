#!/bin/bash
# Script para executar migrations em produção
# Uso: ./deploy-migrate.sh

set -e  # Para em caso de erro

echo "=========================================="
echo "  EXECUTANDO MIGRATIONS EM PRODUÇÃO"
echo "=========================================="
echo ""

# Verifica se está no diretório correto
if [ ! -f "artisan" ]; then
    echo "❌ ERRO: Execute este script na raiz do projeto Laravel (onde está o artisan)"
    exit 1
fi

# Verifica variável de ambiente
if [ -z "$APP_ENV" ] || [ "$APP_ENV" != "production" ]; then
    echo "⚠️  AVISO: APP_ENV não está definido como 'production'"
    echo "   Valor atual: ${APP_ENV:-'não definido'}"
    read -p "   Continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Cancelado."
        exit 1
    fi
fi

# Backup do banco (opcional mas recomendado)
echo ""
echo "📦 Fazendo backup do banco de dados..."
BACKUP_FILE="storage/backups/backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p storage/backups
mysqldump -u${DB_USERNAME:-root} -p${DB_PASSWORD} ${DB_DATABASE} > "$BACKUP_FILE" 2>/dev/null || {
    echo "⚠️  Backup falhou (mysqldump não disponível ou credenciais). Continuando..."
}
if [ -f "$BACKUP_FILE" ]; then
    echo "   ✅ Backup salvo em: $BACKUP_FILE"
fi

# Executa migrations
echo ""
echo "🔄 Executando migrations..."
php artisan migrate --force

# Verifica status
echo ""
echo "📋 Status das migrations:"
php artisan migrate:status

echo ""
echo "=========================================="
echo "  ✅ CONCLUÍDO COM SUCESSO"
echo "=========================================="