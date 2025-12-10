-- Add cards_list column to store menu/carousel options presented to user
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS cards_list JSONB DEFAULT NULL;

-- Add is_card_selection column to flag when user selected a card
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_card_selection BOOLEAN DEFAULT FALSE;

-- Add index for querying card interactions
CREATE INDEX IF NOT EXISTS idx_messages_cards ON public.messages(conversation_id) WHERE cards_list IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_card_selection ON public.messages(conversation_id) WHERE is_card_selection = TRUE;
