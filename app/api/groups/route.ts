import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface GroupCompletion {
  group_id: number;
  completed: boolean;
  completed_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    // Get current user from session
    const userSession = request.cookies.get('user_session');
    let currentUserId = null;

    if (userSession) {
      try {
        const user = JSON.parse(userSession.value);
        currentUserId = user.id;
      } catch {
        console.warn('Failed to parse user session');
      }
    }

    if (groupId) {
      // Get segments for a specific group, ordered by presentation order
      const { data, error } = await supabase
        .from('it_segments')
        .select(`
          id,
          order_presented,
          group_id,
          it_groups (
            group_number
          )
        `)
        .eq('group_id', groupId)
        .order('order_presented');

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch segments' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        segments: data
      });
    } else {
      // Get all groups with completion status for current user
      const { data: groups, error: groupsError } = await supabase
        .from('it_groups')
        .select('id, group_number')
        .order('id');

      if (groupsError) {
        console.error('Database error:', groupsError);
        return NextResponse.json(
          { error: 'Failed to fetch groups' },
          { status: 500 }
        );
      }

      // Get completion status for current user if logged in
      let completions: GroupCompletion[] = [];
      if (currentUserId) {
        const { data: completionData, error: completionError } = await supabase
          .from('it_group_completions')
          .select('group_id, completed, completed_at')
          .eq('user_id', currentUserId);

        if (completionError) {
          console.warn('Failed to fetch completion status:', completionError);
        } else {
          completions = (completionData as GroupCompletion[]) || [];
        }
      }

      // Merge groups with completion status
      const groupsWithStatus = groups.map(group => {
        const completion = completions.find(c => c.group_id === group.id);
        return {
          ...group,
          completed: completion?.completed || false,
          completed_at: completion?.completed_at || null
        };
      });

      return NextResponse.json({
        success: true,
        groups: groupsWithStatus
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update group completion status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, completed } = body;

    if (!groupId || typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid parameters: groupId and completed (boolean) required' },
        { status: 400 }
      );
    }

    // Get current user from session
    const userSession = request.cookies.get('user_session');
    if (!userSession) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let currentUser;
    try {
      currentUser = JSON.parse(userSession.value);
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    console.log(`Updating group ${groupId} completion status to ${completed} for user ${currentUser.id}`);

    // Upsert the completion status
    const { data, error } = await supabase
      .from('it_group_completions')
      .upsert({
        user_id: currentUser.id,
        group_id: parseInt(groupId),
        completed,
        completed_at: completed ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,group_id'
      })
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update completion status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      completion: data?.[0] || null
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}