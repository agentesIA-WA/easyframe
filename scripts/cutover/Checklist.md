# Checklist de Cutover - SDM Modern (Strangler Fig)

## Pré-requisitos
- [ ] O MySQL 8.0 está rodando em produção.
- [ ] PHP 8.3 / Laravel está provisionado e respondendo.
- [ ] O build do React (Frontend) está gerado.
- [ ] As `migrations` do Laravel foram aplicadas (`php artisan migrate`).

## Janela de Atuação (Fase 4 - Final)
- [ ] **Data/Hora:** Agendar janela de manutenção.
- [ ] **Bloqueio:** Desativar temporariamente logins no sistema ColdFusion.

## Sincronização e Migração
- [ ] Executar o comando de carga inicial final: `php artisan sdm:migrate-legacy`.
- [ ] Validar integridade básica dos dados.
- [ ] Desativar triggers/jobs de sincronização bi-direcional (o MySQL será o Master absoluto).

## Virada de Rede (DNS / Proxy)
- [ ] Aplicar as configurações do Nginx (Reverse Proxy) de `nginx-strangler.conf`.
- [ ] Redirecionar todo o tráfego da porta 80/443 para o Nginx.
- [ ] Validar as rotas da API em produção.
- [ ] Validar acesso ao sistema SPA (React).

## Decommissioning (Desligamento)
- [ ] Se a validação for 100% OK e a operação seguir sem problemas por X dias: Desligar os serviços ColdFusion de vez.
- [ ] Executar backup final frio e armazenar de forma segura o banco legado (Access/SQL Server) para auditorias.
