-- Migration: Direct messaging between users and admin (Janine)

CREATE TABLE IF NOT EXISTS ea_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  admin_reply text,
  replied_at timestamptz,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ea_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send messages"
  ON ea_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own messages"
  ON ea_messages FOR SELECT
  USING (auth.uid() = user_id);
