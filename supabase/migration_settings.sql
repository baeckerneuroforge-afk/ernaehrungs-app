-- Migration: User settings (notification preferences + theme)
-- Adds JSONB notification_preferences and theme text column to ea_users

ALTER TABLE ea_users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
    DEFAULT '{"tagebuch_reminder":{"enabled":false,"time":"20:00"},"review_reminder":{"enabled":false},"credit_warning_email":{"enabled":true}}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme TEXT
    DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system'));
