import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

interface MetricConfig {
  key: string;
  name: string;
  description: string;
  range?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type || !['dashboard', 'humanAgent'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use "dashboard" or "humanAgent"' },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from('analysis_settings')
      .select('metrics_config, updated_at')
      .eq('setting_type', type)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        metricsConfig: null,
        message: 'No saved settings found, using defaults',
      });
    }

    return NextResponse.json({
      success: true,
      metricsConfig: data.metrics_config,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, metricsConfig } = body;

    if (!type || !['dashboard', 'humanAgent'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use "dashboard" or "humanAgent"' },
        { status: 400 }
      );
    }

    if (!metricsConfig || !Array.isArray(metricsConfig)) {
      return NextResponse.json(
        { success: false, error: 'metricsConfig must be an array' },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase()
      .from('analysis_settings')
      .upsert(
        {
          setting_type: type,
          metrics_config: metricsConfig,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'setting_type',
        }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `${type} settings saved successfully`,
      updatedAt: data?.updated_at,
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    if (!type || !['dashboard', 'humanAgent'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use "dashboard" or "humanAgent"' },
        { status: 400 }
      );
    }

    const { error } = await getSupabase()
      .from('analysis_settings')
      .delete()
      .eq('setting_type', type);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `${type} settings reset to defaults`,
    });
  } catch (error) {
    console.error('Error deleting settings:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
