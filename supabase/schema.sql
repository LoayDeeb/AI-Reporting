-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Conversations Table (Metadata & Analytics)
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  source_id text not null, -- The original ID from Zainjo/WebAR (e.g., "zainjo-0")
  source_type text not null check (source_type in ('ai', 'human')), -- 'ai' or 'human'
  
  -- Timestamps
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now(),
  
  -- Metrics
  message_count int default 0,
  duration_seconds int,
  first_response_time_ms int,
  
  -- Analytics (AI Analysis)
  quality_score float, -- 0-100
  empathy_score float, -- 0-100
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  sentiment_score float, -- -1.0 to 1.0
  
  -- Metadata
  intent text,
  topics text[], -- Array of detected topics
  sub_categories text[],
  language text default 'en',
  
  -- Flags
  resolution_status text check (resolution_status in ('resolved', 'unresolved', 'escalated')),
  knowledge_gaps text[], -- Array of gaps identified
  
  -- Constraints
  unique(source_id, source_type)
);

-- 2. Messages Table (The actual chat content)
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  
  -- Content
  content text,
  sender_role text check (sender_role in ('user', 'bot', 'agent', 'system')),
  
  -- Metadata
  timestamp timestamptz not null,
  original_message_id text, -- ID from source system if available
  
  -- Analysis (Optional per-message analysis)
  sentiment text,
  intent_detected text
);

-- 3. Analytics Summary (For fast dashboard loading)
create table public.analytics_summary (
  id uuid primary key default uuid_generate_v4(),
  date date not null unique,
  
  total_conversations int default 0,
  avg_quality_score float,
  avg_response_time_ms float,
  sentiment_distribution jsonb, -- { positive: 50, negative: 10 }
  top_topics jsonb,
  
  updated_at timestamptz default now()
);

-- Indexes for performance
create index idx_conversations_source_type on public.conversations(source_type);
create index idx_conversations_sentiment on public.conversations(sentiment);
create index idx_conversations_quality on public.conversations(quality_score);
create index idx_messages_conversation_id on public.messages(conversation_id);
