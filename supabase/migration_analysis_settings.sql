-- Create table to store analysis settings (metric descriptions for prompts)
CREATE TABLE IF NOT EXISTS public.analysis_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_type TEXT NOT NULL CHECK (setting_type IN ('dashboard', 'humanAgent')),
    metrics_config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(setting_type)
);

-- Add index for quick lookups by setting_type
CREATE INDEX IF NOT EXISTS idx_analysis_settings_type ON public.analysis_settings(setting_type);

-- Comment explaining the table
COMMENT ON TABLE public.analysis_settings IS 'Stores customizable metric descriptions used in AI analysis prompts';
COMMENT ON COLUMN public.analysis_settings.setting_type IS 'Type of settings: dashboard or humanAgent';
COMMENT ON COLUMN public.analysis_settings.metrics_config IS 'JSON array of metric configurations with key, name, description, and optional range';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analysis_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_analysis_settings_updated_at ON public.analysis_settings;
CREATE TRIGGER trigger_update_analysis_settings_updated_at
    BEFORE UPDATE ON public.analysis_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_analysis_settings_updated_at();
