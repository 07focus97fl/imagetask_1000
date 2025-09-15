import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// GET - Get full conversation details including status and user info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation_id parameter' },
        { status: 400 }
      );
    }

    const { data: conversation, error } = await supabase
      .from('iv_conversations')
      .select(`
        id,
        first_pass_completed,
        second_pass_completed,
        final_pass_locked,
        in_progress_by,
        in_progress_user:iv_users!in_progress_by(id, display_name, role)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation details:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversation details', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Error in GET conversation details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 