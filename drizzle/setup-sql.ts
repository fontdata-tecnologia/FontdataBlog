export const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text UNIQUE NOT NULL,
  "password_hash" text NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'admin',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "excerpt" text NOT NULL DEFAULT '',
  "cover_image" text,
  "status" text NOT NULL DEFAULT 'draft',
  "published_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "posts" ("status");
CREATE INDEX IF NOT EXISTS "posts_published_at_idx" ON "posts" ("published_at");

CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text UNIQUE NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "description" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tags" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text UNIQUE NOT NULL,
  "slug" text UNIQUE NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "post_categories" (
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "category_id" integer NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "category_id")
);

CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "tag_id" integer NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("post_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "site_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "token" text UNIQUE NOT NULL,
  "active" text NOT NULL DEFAULT 'true',
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "article_themes" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "source" text NOT NULL DEFAULT 'manual',
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "article_themes_status_idx" ON "article_themes" ("status");

CREATE TABLE IF NOT EXISTS "page_views" (
  "id" serial PRIMARY KEY NOT NULL,
  "path" text NOT NULL,
  "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
  "post_slug" text,
  "post_title" text,
  "referrer" text,
  "user_agent" text,
  "ip" text,
  "visited_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "page_views_visited_at_idx" ON "page_views" ("visited_at");
CREATE INDEX IF NOT EXISTS "page_views_post_id_idx" ON "page_views" ("post_id");
CREATE INDEX IF NOT EXISTS "page_views_path_idx" ON "page_views" ("path");

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text UNIQUE NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "subscribed_at" timestamp NOT NULL DEFAULT now(),
  "unsubscribed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "newsletter_email_idx" ON "newsletter_subscribers" ("email");
CREATE INDEX IF NOT EXISTS "newsletter_status_idx" ON "newsletter_subscribers" ("status");

CREATE TABLE IF NOT EXISTS "automation_config" (
  "id" serial PRIMARY KEY NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "interval_hours" real NOT NULL DEFAULT 24,
  "theme_ids" text NOT NULL DEFAULT '[]',
  "custom_prompt" text,
  "last_run_at" timestamp,
  "next_run_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
`
