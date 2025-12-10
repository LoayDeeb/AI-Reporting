-- Add sequence_number column to preserve original message order
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS sequence_number INTEGER DEFAULT 0;

-- Add index for ordering
CREATE INDEX IF NOT EXISTS idx_messages_sequence ON public.messages(conversation_id, sequence_number);
