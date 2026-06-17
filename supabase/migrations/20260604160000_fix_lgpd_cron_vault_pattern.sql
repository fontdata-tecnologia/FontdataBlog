-- Corrige o cron lgpd-data-retention para usar vault.decrypted_secrets
-- (padrão correto do projeto — ver docs/supabase-cron-setup.sql)

-- Remove o job com padrão incorreto (current_setting)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lgpd-data-retention') THEN
    PERFORM cron.unschedule('lgpd-data-retention');
  END IF;
END;
$$;

-- Recria com padrão correto usando vault.decrypted_secrets
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
