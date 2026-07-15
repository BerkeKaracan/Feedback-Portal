-- Expose tables to PostgREST roles + allow authenticated status updates (local MVP)

GRANT SELECT ON TABLE posts TO anon, authenticated;
GRANT INSERT ON TABLE posts TO authenticated;
GRANT UPDATE ON TABLE posts TO authenticated;

GRANT SELECT ON TABLE votes TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE votes TO authenticated;

CREATE POLICY "Authenticated users can update posts"
  ON posts FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
