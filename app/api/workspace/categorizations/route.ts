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
    // First get all frame IDs for this group
    const { data: frameIds, error: frameError } = await supabase
      .from('it_frames')
      .select(`
        id,
        side,
        it_segments!inner (
          group_id
        )
      `)
      .eq('it_segments.group_id', parseInt(groupId));

    if (frameError) {
      console.error('Error fetching frame IDs for group:', frameError);
      return NextResponse.json(
        { error: 'Failed to fetch frame IDs' },
        { status: 500 }
      );
    }

    if (!frameIds || frameIds.length === 0) {
      console.log(`No frames found for group ${groupId}`);
      return NextResponse.json({
        success: true,
        categorizations: {}
      });
    }

    console.log(`Found ${frameIds.length} frames for group ${groupId}`);

    // Now get categorizations for those frames
    const frameIdList = frameIds.map(f => f.id);
    const { data, error } = await supabase
      .from('it_categorizations')
      .select('id, frame_id, user_id, category, note, flagged')
      .in('frame_id', frameIdList);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categorizations' },
        { status: 500 }
      );
    }

    console.log(`Found ${data?.length || 0} categorizations`);


    // Create a map of frame ID to side for easy lookup
    const frameIdToSide = new Map();
    frameIds.forEach(frame => {
      frameIdToSide.set(frame.id, frame.side === 0 ? 'left' : 'right');
    });

    // Format categorizations for the frontend using frame ID and side
    const categorizations: { [key: string]: CategorizationData } = {};

    if (data) {
      data.forEach(cat => {
        const side = frameIdToSide.get(cat.frame_id);
        if (!side) {
          console.warn(`No side data found for frame ${cat.frame_id}`);
          return;
        }

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

    // After saving explicit changes, ensure all frames in the group have categorizations
    // This creates default '0' categorizations for any uncategorized frames
    try {
      console.log(`Ensuring all frames in group ${groupId} have categorizations for user ${userId}`);

      // Get all frames in this group
      const { data: allFrames, error: framesError } = await supabase
        .from('it_frames')
        .select(`
          id,
          it_segments!inner (
            group_id
          )
        `)
        .eq('it_segments.group_id', parseInt(groupId));

      if (framesError) {
        console.error('Error fetching frames for default categorizations:', framesError);
      } else if (allFrames && allFrames.length > 0) {
        // Get existing categorizations for this user and group
        const { data: existingCats, error: catsError } = await supabase
          .from('it_categorizations')
          .select('frame_id')
          .eq('user_id', userId)
          .in('frame_id', allFrames.map(f => f.id));

        if (catsError) {
          console.error('Error fetching existing categorizations:', catsError);
        } else {
          const existingFrameIds = new Set(existingCats?.map(c => c.frame_id) || []);
          const missingFrames = allFrames.filter(frame => !existingFrameIds.has(frame.id));

          if (missingFrames.length > 0) {
            console.log(`Creating default '0' categorizations for ${missingFrames.length} uncategorized frames`);

            const defaultCategorizations = missingFrames.map(frame => ({
              frame_id: frame.id,
              user_id: userId,
              category: '0',
              note: null,
              flagged: false
            }));

            const { error: defaultError, count: defaultCount } = await supabase
              .from('it_categorizations')
              .insert(defaultCategorizations);

            if (defaultError) {
              console.error('Error creating default categorizations:', defaultError);
            } else {
              const defaultSaved = defaultCount || defaultCategorizations.length;
              saved += defaultSaved;
              console.log(`Successfully created ${defaultSaved} default categorizations`);
            }
          } else {
            console.log('All frames in group already have categorizations');
          }
        }
      }
    } catch (defaultError) {
      console.error('Error in default categorization process:', defaultError);
      // Don't fail the main save operation if default categorization fails
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
