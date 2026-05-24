-- Add file_attachments column to order_messages table
ALTER TABLE order_messages
ADD COLUMN file_attachments jsonb DEFAULT NULL;

-- Create index for faster queries on file attachments
CREATE INDEX idx_order_messages_file_attachments ON order_messages USING GIN (file_attachments);

-- Add read_status column if it doesn't exist (for tracking read/unread messages)
ALTER TABLE order_messages
ADD COLUMN read_status text DEFAULT 'unread';

-- Create index for read_status
CREATE INDEX idx_order_messages_read_status ON order_messages(read_status);
