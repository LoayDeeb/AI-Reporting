-- Add missing columns to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS recommendations text[],
ADD COLUMN IF NOT EXISTS trends text[],
ADD COLUMN IF NOT EXISTS customer_effort_score float; -- For human agents

-- Make constraints less strict for ingestion (optional, but safer for legacy data)
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_resolution_status_check;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_resolution_status_check 
  CHECK (resolution_status IN ('resolved', 'unresolved', 'escalated', 'partial', 'pending'));
