-- Add threading support to order_messages table
ALTER TABLE order_messages
ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES order_messages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS thread_root_id uuid,
ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;

-- Create index for thread queries
CREATE INDEX IF NOT EXISTS idx_order_messages_parent_id ON order_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_thread_root ON order_messages(thread_root_id);

-- Function to update reply count when a reply is added
CREATE OR REPLACE FUNCTION update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a reply (has parent_message_id), increment parent's reply_count
  IF NEW.parent_message_id IS NOT NULL THEN
    UPDATE order_messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_message_id;
    
    -- Set thread_root_id if not already set
    IF NEW.thread_root_id IS NULL THEN
      UPDATE order_messages
      SET thread_root_id = COALESCE((
        SELECT id FROM order_messages WHERE id = NEW.parent_message_id AND parent_message_id IS NULL
      ), NEW.parent_message_id)
      WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reply count
DROP TRIGGER IF EXISTS trigger_update_reply_count ON order_messages;
CREATE TRIGGER trigger_update_reply_count
AFTER INSERT ON order_messages
FOR EACH ROW
EXECUTE FUNCTION update_message_reply_count();

-- Function to decrement reply count when a reply is deleted
CREATE OR REPLACE FUNCTION decrement_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.parent_message_id IS NOT NULL THEN
    UPDATE order_messages
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.parent_message_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for decrement
DROP TRIGGER IF EXISTS trigger_decrement_reply_count ON order_messages;
CREATE TRIGGER trigger_decrement_reply_count
AFTER DELETE ON order_messages
FOR EACH ROW
EXECUTE FUNCTION decrement_message_reply_count();
