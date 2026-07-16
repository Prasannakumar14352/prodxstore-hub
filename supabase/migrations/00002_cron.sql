-- Schedules the process-review-emails Edge Function every 15 minutes.
-- BEFORE APPLYING: replace <PROJECT_REF> and <SERVICE_ROLE_KEY> below.
-- (Dashboard → Project Settings → API for both values.)

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'process-review-emails',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/process-review-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
