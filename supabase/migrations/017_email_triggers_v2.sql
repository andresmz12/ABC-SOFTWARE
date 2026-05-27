-- Migration 017: Email triggers for job_started and new_message events

-- ─── Trigger: job status → 'in_progress' → email client ─────────────────────

CREATE OR REPLACE FUNCTION trg_email_job_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in_progress' AND (OLD.status IS DISTINCT FROM 'in_progress') THEN
    PERFORM send_email_notification(jsonb_build_object(
      'type', 'job_started',
      'data', to_jsonb(NEW)
    ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_on_job_started ON job_requests;
CREATE TRIGGER email_on_job_started
  AFTER UPDATE ON job_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_email_job_started();

-- ─── Trigger: new message → email recipient ───────────────────────────────────
-- User → admin : only on the first message of the chat (new support request)
-- Admin → user : always notify

CREATE OR REPLACE FUNCTION trg_email_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chat RECORD;
  _msg_count INTEGER;
BEGIN
  SELECT user_id, admin_id INTO _chat
  FROM chats
  WHERE id = NEW.chat_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id = _chat.user_id THEN
    -- User is sending: only email admins if this is the very first message
    SELECT COUNT(*) INTO _msg_count
    FROM messages
    WHERE chat_id = NEW.chat_id AND id != NEW.id;

    IF _msg_count = 0 THEN
      PERFORM send_email_notification(jsonb_build_object(
        'type', 'new_message',
        'data', to_jsonb(NEW)
      ));
    END IF;
  ELSE
    -- Admin is sending: always notify the user
    PERFORM send_email_notification(jsonb_build_object(
      'type', 'new_message',
      'data', to_jsonb(NEW)
    ));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_on_new_message ON messages;
CREATE TRIGGER email_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trg_email_new_message();
