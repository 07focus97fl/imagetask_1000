import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Helper function to extract frame number from frame_name
function extractFrameNumber(frameName: string): number {
  // Expected format: "4313_C1_139_1" where 139 is the frame number
  const parts = frameName.split('_');
  if (parts.length >= 3) {
    return parseInt(parts[2]) || 0;
  }
  return 0;
}

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

    // Get all frames for the segment
    const { data, error } = await supabase
      .from('it_frames')
      .select(`
        id,
        frame_name,
        frame_url,
        segment_id
      `)
      .eq('segment_id', segmentId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch frames' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        frames: [],
        totalFrames: 0
      });
    }

    // Sort frames by the frame number extracted from frame_name
    const sortedFrames = data.sort((a, b) => {
      const frameNumA = extractFrameNumber(a.frame_name);
      const frameNumB = extractFrameNumber(b.frame_name);
      return frameNumA - frameNumB;
    });

    // Format frames for the frontend
    const formattedFrames = sortedFrames.map((frame, index) => ({
      frameNumber: index, // 0-based index for frontend
      data: frame.frame_url,
      size: 0, // We don't track size in the new structure
      id: frame.id,
      name: frame.frame_name
    }));

    return NextResponse.json({
      success: true,
      frames: formattedFrames,
      totalFrames: formattedFrames.length
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}