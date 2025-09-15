import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface CategorizationData {
  frame_id: number;
  category: string;
  flagged: boolean;
  note: string | null;
}

interface CategorizationChange {
  category: string;
  flagged: boolean;
  note?: string | null;
}

// GET - Load existing categorizations for a segment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing group_id parameter' },
        { status: 400 }
      );
    }

    console.log(`Loading categorizations for group ${groupId}`);

    // Get all categorizations for frames in all segments of this group
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
          segment_id,
          side,
          it_segments!inner (
            group_id,
            order_presented
          )
        )
      `)
      .eq('it_frames.it_segments.group_id', groupId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categorizations' },
        { status: 500 }
      );
    }

    console.log(`Found ${data?.length || 0} categorizations`);

    // Helper function to extract frame number from frame_name
    function extractFrameNumber(frameName: string): number {
      const parts = frameName.split('_');
      if (parts.length >= 3) {
        return parseInt(parts[2]) || 0;
      }
      return 0;
    }

    // Format categorizations for the frontend using frame number and side
    const categorizations: { [key: string]: CategorizationData } = {};

    if (data) {
      data.forEach(cat => {
        const side = cat.it_frames.side === 0 ? 'left' : 'right';
        const key = `frame_${cat.frame_id}_${side}`;

        categorizations[key] = {
          frame_id: cat.frame_id,
          category: cat.category,
          flagged: cat.flagged || false,
          note: cat.note
        };
      });
    }

    console.log(`Returning ${Object.keys(categorizations).length} categorizations`);

    return NextResponse.json({
      success: true,
      categorizations
    });

  } catch (error) {
    console.error('Error in GET categorizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Bulk save categorizations
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, changes, userId } = body;

    if (!groupId || !changes || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Prepare all changes for bulk upsert
    const upsertData = [];
    const results = [];

    for (const [key, data] of Object.entries(changes)) {
      try {
        // Extract frame_id from key (format: "frame_123_left" or "frame_123_right")
        const keyMatch = key.match(/frame_(\d+)_(left|right)/);
        if (!keyMatch) {
          results.push({ key, success: false, error: 'Invalid key format' });
          continue;
        }

        const frameId = parseInt(keyMatch[1]);
        const catData = data as CategorizationChange;

        // Prepare data for bulk upsert
        upsertData.push({
          frame_id: frameId,
          user_id: userId,
          category: catData.category || '0',
          note: catData.note,
          flagged: catData.flagged || false
        });

        results.push({ key, success: true }); // Assume success, will update if bulk operation fails
      } catch (err) {
        console.error(`Error processing ${key}:`, err);
        results.push({ key, success: false, error: 'Processing error' });
      }
    }

    // Perform bulk upsert operation
    let saved = 0;
    if (upsertData.length > 0) {
      console.log(`Performing bulk upsert of ${upsertData.length} categorizations`);

      const { error, count } = await supabase
        .from('it_categorizations')
        .upsert(upsertData, {
          onConflict: 'frame_id,user_id'
        });

      if (error) {
        console.error('Bulk upsert error:', error);
        // Mark all as failed if bulk operation fails
        results.forEach(result => {
          if (result.success) {
            result.success = false;
            result.error = error.message;
          }
        });
        saved = 0;
      } else {
        saved = count || upsertData.length;
        console.log(`Successfully saved ${saved} categorizations in bulk`);
      }
    }

    return NextResponse.json({
      success: saved > 0,
      saved,
      total: Object.keys(changes).length,
      results
    });

  } catch (error) {
    console.error('Error in PUT categorizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
