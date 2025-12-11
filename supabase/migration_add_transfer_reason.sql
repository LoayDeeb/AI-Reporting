-- Add transfer_reason column to store why user was transferred to human agent
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS transfer_reason TEXT DEFAULT NULL;

-- Add was_transferred_to_agent flag
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS was_transferred_to_agent BOOLEAN DEFAULT FALSE;

-- Add index for querying transferred conversations
CREATE INDEX IF NOT EXISTS idx_conversations_transferred ON public.conversations(was_transferred_to_agent) WHERE was_transferred_to_agent = TRUE;

-- Comment explaining the columns
COMMENT ON COLUMN public.conversations.transfer_reason IS 'AI-analyzed reason why the user was transferred to a human agent';
COMMENT ON COLUMN public.conversations.was_transferred_to_agent IS 'Whether the conversation was transferred to a human agent';
