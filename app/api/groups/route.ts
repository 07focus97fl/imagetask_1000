import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

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
      // Get all groups
      const { data, error } = await supabase
        .from('it_groups')
        .select('id, group_number')
        .order('id');

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch groups' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        groups: data
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