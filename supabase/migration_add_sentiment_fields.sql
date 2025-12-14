-- Add initial_sentiment and final_sentiment columns to conversations table
-- These track sentiment progression during human agent conversations

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS initial_sentiment TEXT,
ADD COLUMN IF NOT EXISTS final_sentiment TEXT;

-- Add check constraint for valid values
ALTER TABLE conversations
ADD CONSTRAINT valid_initial_sentiment 
CHECK (initial_sentiment IS NULL OR initial_sentiment IN ('positive', 'neutral', 'negative'));

ALTER TABLE conversations
ADD CONSTRAINT valid_final_sentiment 
CHECK (final_sentiment IS NULL OR final_sentiment IN ('positive', 'neutral', 'negative'));
