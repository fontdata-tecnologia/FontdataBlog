-- LGPD Art. 15/16 — cron diário de retenção de dados
-- Agenda execução diária às 03:00 UTC via pg_cron + pg_net
-- O endpoint /api/cron/data-retention é autenticado por SUPABASE_SERVICE_ROLE_KEY
-- Pré-requisito: vault.decrypted_secrets com 'app_url' e 'service_role_key' já configurados
-- (ver docs/supabase-cron-setup.sql para configuração inicial do vault)

-- Remove job anterior se existir (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lgpd-data-retention') THEN
    PERFORM cron.unschedule('lgpd-data-retention');
  END IF;
END;
$$;

-- Agenda execução diária às 03:00 UTC
SELECT cron.schedule(
  'lgpd-data-retention',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'app_url') || '/api/cron/data-retention',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
