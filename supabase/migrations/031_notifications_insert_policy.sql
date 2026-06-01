-- Migration 031: Allow any authenticated user to insert notifications
--
-- Problem: notifications_owner_all is FOR ALL USING (user_id = auth.uid()).
-- PostgreSQL applies the USING predicate as both a visibility filter AND a
-- WITH CHECK on INSERT — so inserting a notification for another user
-- (e.g. provider → client "job started") fails with 403.
--
-- Fix: add a separate INSERT-only policy that lets any authenticated user
-- create a notification for any recipient. Read/delete remain owner-only.

DROP POLICY IF EXISTS "notifications_insert_any_auth" ON notifications;

CREATE POLICY "notifications_insert_any_auth" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
