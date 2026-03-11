-- Fix RLS policies for ea_documents: allow authenticated users to delete
-- (Admin-only access is enforced at application layer via middleware)

CREATE POLICY "Auth users can delete documents"
  ON ea_documents FOR DELETE
  USING (auth.uid() IS NOT NULL);
