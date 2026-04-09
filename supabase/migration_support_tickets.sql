-- Support tickets created via the /support contact form.
-- user_id is nullable because logged-out visitors can also submit tickets.

CREATE TABLE IF NOT EXISTS ea_support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON ea_support_tickets(status, created_at DESC);
