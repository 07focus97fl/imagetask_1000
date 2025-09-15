import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Storage } from '@google-cloud/storage';

interface FrameData {
  id: number;
  frame_name: string;
  frame_url: string;
  segment_id: number;
  side: number;
  it_segments: {
    order_presented: number;
    group_id: number;
  }[];
}

interface FrameGroup {
  frameNumber: number;
  frame_name: string;
  frame_url: string;
  segment_id: number;
  segment_order: number;
  left: { id: number; url: string } | null;
  right: { id: number; url: string } | null;
}

interface SegmentGroup {
  segmentId: number;
  segmentOrder: number;
  frames: Map<number, FrameGroup>;
}

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET || 'mcnulty_frames');

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
    const group = searchParams.get('group');

    if (!group) {
      return NextResponse.json(
        { error: 'Missing required parameter: group' },
        { status: 400 }
      );
    }

    console.log(`Fetching frames for group: ${group}`);

    // Get all frames for all segments in this group
    const { data, error } = await supabase
      .from('it_frames')
      .select(`
        id,
        frame_name,
        frame_url,
        segment_id,
        side,
        it_segments!inner (
          order_presented,
          group_id
        )
      `)
      .eq('it_segments.group_id', group);

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
        totalFrames: 0,
        group: {
          group
        }
      });
    }

    // Group frames by segment and frame number, maintaining segment order
    const segmentFrameGroups = new Map<number, SegmentGroup>();

    data.forEach((frame: FrameData) => {
      const segmentId = frame.segment_id;
      const segmentOrder = frame.it_segments[0].order_presented;
      const frameNum = extractFrameNumber(frame.frame_name);

      if (!segmentFrameGroups.has(segmentId)) {
        segmentFrameGroups.set(segmentId, {
          segmentId,
          segmentOrder,
          frames: new Map<number, FrameGroup>()
        });
      }

      const segmentGroup = segmentFrameGroups.get(segmentId)!;

      if (!segmentGroup.frames.has(frameNum)) {
        segmentGroup.frames.set(frameNum, {
          frameNumber: frameNum,
          frame_name: frame.frame_name,
          frame_url: frame.frame_url,
          segment_id: segmentId,
          segment_order: segmentOrder,
          left: null,
          right: null
        });
      }

      const frameGroup = segmentGroup.frames.get(frameNum)!;
      if (frame.side === 0) {
        frameGroup.left = { id: frame.id, url: frame.frame_url };
      } else if (frame.side === 1) {
        frameGroup.right = { id: frame.id, url: frame.frame_url };
      }
    });

    // Convert to flat array, ordered by segment order_presented, then by frame number
    const allFrames: FrameGroup[] = [];
    const sortedSegments = Array.from(segmentFrameGroups.values())
      .sort((a, b) => a.segmentOrder - b.segmentOrder);

    sortedSegments.forEach(segment => {
      const sortedFrames = Array.from(segment.frames.values())
        .sort((a, b) => a.frameNumber - b.frameNumber);
      allFrames.push(...sortedFrames);
    });

    // Fetch all frame images from Google Cloud Storage and convert to base64 for smooth navigation
    const framePromises = allFrames.map(async (frameGroup, index) => {
      try {
        // Extract the GCS path from the frame_url
        // Expected format: "https://storage.cloud.google.com/mcnulty_frames/mcnulty/t7/4313_c1/139"
        let gcsPath = frameGroup.frame_url;

        // If it's a full URL, extract just the path part
        if (gcsPath.startsWith('https://storage.cloud.google.com/')) {
          const urlParts = gcsPath.split('/');
          // Remove the first 4 parts: https:, , storage.cloud.google.com, bucket_name
          gcsPath = urlParts.slice(4).join('/');
        }

        console.log(`Downloading frame from GCS path: ${gcsPath}`);

        // Download from Google Cloud Storage
        const file = bucket.file(gcsPath);
        const [buffer] = await file.download();

        // Convert buffer to base64
        const base64 = buffer.toString('base64');
        const contentType = 'image/jpeg'; // Assuming all frames are JPEG

        return {
          frameNumber: index, // 0-based index for frontend (sequential across all segments)
          data: `data:${contentType};base64,${base64}`, // Convert to base64 data URL
          size: buffer.length,
          name: frameGroup.frame_name,
          segment_id: frameGroup.segment_id,
          segment_order: frameGroup.segment_order,
          original_frame_number: frameGroup.frameNumber, // Keep original frame number for reference
          // Include frame IDs for both sides for categorization
          leftFrameId: frameGroup.left?.id || null,
          rightFrameId: frameGroup.right?.id || null
        };
      } catch (error) {
        console.error(`Error downloading frame ${frameGroup.frame_name}:`, error);
        // Return frame with original URL as fallback
        return {
          frameNumber: index,
          data: frameGroup.frame_url, // Fallback to URL if download fails
          size: 0,
          name: frameGroup.frame_name,
          segment_id: frameGroup.segment_id,
          segment_order: frameGroup.segment_order,
          original_frame_number: frameGroup.frameNumber,
          leftFrameId: frameGroup.left?.id || null,
          rightFrameId: frameGroup.right?.id || null
        };
      }
    });

    // Wait for all frames to be downloaded and converted
    const formattedFrames = await Promise.all(framePromises);

    console.log(`Successfully loaded ${formattedFrames.length} frame pairs from ${segmentFrameGroups.size} segments`);

    return NextResponse.json({
      success: true,
      totalFrames: formattedFrames.length,
      frames: formattedFrames,
      group: {
        group
      }
    });

  } catch (error) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      { error: 'Failed to fetch frames', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
