-- LGPD Art. 8º — consentimento explícito para newsletter
-- Adiciona colunas de rastreamento de consentimento em newsletter_subscribers
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "consent_at" timestamp;
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "consent_text_version" text;
