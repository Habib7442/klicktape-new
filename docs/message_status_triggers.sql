-- Message Status Triggers for Real-time Updates
-- This file creates database triggers to automatically update message status

-- Function to update message status to 'delivered' when message is inserted
-- NOTE: This is now handled by Socket.IO server, but keeping for backup
CREATE OR REPLACE FUNCTION update_message_status_to_delivered()
RETURNS TRIGGER AS $$
BEGIN
    -- Keep original status as 'sent' - server will update to 'delivered'
    -- This allows us to see the progression: sent -> delivered -> read
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update message status to 'read' when is_read is set to true
CREATE OR REPLACE FUNCTION update_message_status_to_read()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_read changed from false to true, update status and read_at
    IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
        NEW.status = 'read';
        NEW.read_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set status to 'delivered' when message is inserted
DROP TRIGGER IF EXISTS trigger_message_delivered ON messages;
CREATE TRIGGER trigger_message_delivered
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_status_to_delivered();

-- Trigger to automatically set status to 'read' when is_read is updated
DROP TRIGGER IF EXISTS trigger_message_read ON messages;
CREATE TRIGGER trigger_message_read
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_status_to_read();

-- Add indexes for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON messages(delivered_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);

-- Update existing messages to have proper status
UPDATE messages 
SET status = 'read', read_at = COALESCE(read_at, created_at)
WHERE is_read = TRUE AND status != 'read';

UPDATE messages 
SET status = 'delivered', delivered_at = COALESCE(delivered_at, created_at)
WHERE is_read = FALSE AND status = 'sent';

COMMENT ON FUNCTION update_message_status_to_delivered() IS 'Automatically sets message status to delivered when inserted';
COMMENT ON FUNCTION update_message_status_to_read() IS 'Automatically sets message status to read when is_read is updated to true';
