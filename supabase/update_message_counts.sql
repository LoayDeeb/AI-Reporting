-- Update message_count for all conversations based on actual message count
UPDATE conversations c
SET message_count = subq.cnt
FROM (
  SELECT conversation_id, COUNT(*) as cnt
  FROM messages
  GROUP BY conversation_id
) subq
WHERE c.id = subq.conversation_id;
