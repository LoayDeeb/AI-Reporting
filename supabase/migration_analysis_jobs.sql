-- Create table to track analysis jobs and their progress
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_name TEXT NOT NULL, -- e.g., "v1", "Custom Analysis 2024-01-15"
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('dashboard', 'humanAgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    -- Progress tracking
    total_conversations INT DEFAULT 0,
    processed_conversations INT DEFAULT 0,
    error_count INT DEFAULT 0,
    
    -- Configuration
    metrics_config JSONB, -- Snapshot of metrics config used
    custom_prompt TEXT, -- The prompt used for this analysis
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Error info
    error_message TEXT
);

-- Add analysis_version column to conversations table to track which analysis run
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS analysis_version UUID REFERENCES public.analysis_jobs(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON public.analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_type ON public.analysis_jobs(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created ON public.analysis_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_analysis_version ON public.conversations(analysis_version);

-- Comments
COMMENT ON TABLE public.analysis_jobs IS 'Tracks analysis jobs with progress and versioning';
COMMENT ON COLUMN public.analysis_jobs.version_name IS 'User-friendly name for this analysis version';
COMMENT ON COLUMN public.analysis_jobs.metrics_config IS 'Snapshot of the metrics configuration used for this analysis';
