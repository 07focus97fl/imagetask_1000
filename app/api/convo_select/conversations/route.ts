import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timepoint = searchParams.get('timepoint');
    const couples = searchParams.get('couples'); // comma-separated list
    const summaryOnly = searchParams.get('summary_only') === 'true';
    
    if (!timepoint || !couples) {
      return NextResponse.json(
        { error: 'Missing timepoint or couples parameter' },
        { status: 400 }
      );
    }

    const coupleList = couples.split(',');

    // Query conversations with related data
    const { data, error } = await supabase
      .from('iv_conversations')
      .select(`
        id,
        convo_number,
        first_pass_completed,
        second_pass_completed,
        final_pass_locked,
        note,
        first_pass_by,
        second_pass_by,
        in_progress_by,
        iv_couples!inner (
          code,
          iv_timepoints!inner (
            code
          )
        ),
        first_pass_user:iv_users!first_pass_by (display_name),
        second_pass_user:iv_users!second_pass_by (display_name),
        in_progress_user:iv_users!in_progress_by (display_name)
      `)
      .eq('iv_couples.iv_timepoints.code', timepoint)
      .in('iv_couples.code', coupleList);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const stats = {
      total: data?.length || 0,
      locked: 0,
      second_pass: 0,
      first_pass: 0,
      in_progress: 0,
      available: 0
    };

    if (data) {
      data.forEach(conv => {
        if (conv.in_progress_by) {
          stats.in_progress++;
        } else if (conv.final_pass_locked) {
          stats.locked++;
        } else if (conv.second_pass_completed) {
          stats.second_pass++;
        } else if (conv.first_pass_completed) {
          stats.first_pass++;
        } else {
          stats.available++;
        }
      });
    }

    // If only summary is requested, return just the stats
    if (summaryOnly) {
      return NextResponse.json({ 
        success: true, 
        stats,
        couples: coupleList 
      });
    }

    // Return full data with stats
    return NextResponse.json({ 
      success: true, 
      data, 
      stats 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 