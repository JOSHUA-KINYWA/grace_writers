-- Add read_status column to order_messages table
ALTER TABLE order_messages 
ADD COLUMN IF NOT EXISTS read_status TEXT DEFAULT 'unread' CHECK (read_status IN ('read', 'unread'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_order_messages_read_status ON order_messages(read_status);
