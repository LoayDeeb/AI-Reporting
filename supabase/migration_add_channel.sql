-- Add channel column to conversations table (web or app)
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'unknown';

-- Add index for channel filtering
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations(channel);

-- Optional: Add check constraint for valid channel values
-- ALTER TABLE public.conversations
-- ADD CONSTRAINT conversations_channel_check CHECK (channel IN ('web', 'app', 'unknown'));
