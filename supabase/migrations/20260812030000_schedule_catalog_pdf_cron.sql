-- Migration to schedule the daily catalog PDF generation at 3:00 AM Mexico Time (09:00 UTC)
-- Uses pg_cron and pg_net to invoke the generate-catalog-pdf Edge Function safely.

-- 1. Enable pg_cron and pg_net extensions if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Remove any previously scheduled job with the same name
SELECT cron.unschedule('daily-catalog-pdf-generation')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-catalog-pdf-generation'
);

-- 3. Schedule the cron job to run daily at 09:00 UTC (3:00 AM CST / Hora Centro México)
-- Calls the Supabase Edge Function generate-catalog-pdf via net.http_post
SELECT cron.schedule(
  'daily-catalog-pdf-generation',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-catalog-pdf'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
    ),
    body := '{}'::jsonb
  );
  $$
);
