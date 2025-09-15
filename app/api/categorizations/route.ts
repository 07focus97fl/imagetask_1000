import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segment_id');

    if (!segmentId) {
      return NextResponse.json(
        { error: 'Missing segment_id parameter' },
        { status: 400 }
      );
    }

    // Get all categorizations for frames in this segment
    const { data, error } = await supabase
      .from('it_categorizations')
      .select(`
        id,
        frame_id,
        user_id,
        category,
        note,
        flagged,
        it_frames!inner (
          frame_name,
          segment_id
        )
      `)
      .eq('it_frames.segment_id', segmentId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categorizations' },
        { status: 500 }
      );
    }

    // Format categorizations for the frontend
    const categorizations: { [key: string]: { frame_id: number; category: string; flagged: boolean; note: string | null } } = {};

    if (data) {
      data.forEach(cat => {
        const key = `frame_${cat.frame_id}`;
        categorizations[key] = {
          frame_id: cat.frame_id,
          category: cat.category,
          flagged: cat.flagged || false,
          note: cat.note
        };
      });
    }

    return NextResponse.json({
      success: true,
      categorizations
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { segmentId, changes, userId } = await request.json();

    if (!segmentId || !changes || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const results = [];
    let saved = 0;

    for (const [key, data] of Object.entries(changes)) {
      try {
        // Extract frame_id from key (format: "frame_123")
        const frameIdMatch = key.match(/frame_(\d+)/);
        if (!frameIdMatch) continue;

        const frameId = parseInt(frameIdMatch[1]);
        const catData = data as { category: string; flagged?: boolean; note?: string | null };

        // Upsert categorization
        const { error } = await supabase
          .from('it_categorizations')
          .upsert({
            frame_id: frameId,
            user_id: userId,
            category: catData.category,
            note: catData.note,
            flagged: catData.flagged || false
          }, {
            onConflict: 'frame_id,user_id'
          });

        if (error) {
          console.error(`Error saving ${key}:`, error);
          results.push({ key, success: false, error: error.message });
        } else {
          results.push({ key, success: true });
          saved++;
        }
      } catch (err) {
        console.error(`Error processing ${key}:`, err);
        results.push({ key, success: false, error: 'Processing error' });
      }
    }

    return NextResponse.json({
      success: saved > 0,
      saved,
      total: Object.keys(changes).length,
      results
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}