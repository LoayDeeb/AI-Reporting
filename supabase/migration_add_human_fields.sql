-- Add missing columns for Human Agent Analysis
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS agent_name text,
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS coaching_opportunities text[],
ADD COLUMN IF NOT EXISTS script_adherence float,
ADD COLUMN IF NOT EXISTS escalation_risk float,
ADD COLUMN IF NOT EXISTS root_causes text[],
ADD COLUMN IF NOT EXISTS churn_signals text[],
ADD COLUMN IF NOT EXISTS sentiment_change text;

-- Add indexes for new fields often used in filtering
CREATE INDEX IF NOT EXISTS idx_conversations_agent_name ON public.conversations(agent_name);
