-- Add unique constraint to original_message_id to support idempotent ingestion
ALTER TABLE public.messages
ADD CONSTRAINT messages_original_message_id_key UNIQUE (original_message_id);

-- Also ensure source_id + source_type is unique in conversations (already done in schema, but good to be sure for ingest)
-- existing: unique(source_id, source_type)





