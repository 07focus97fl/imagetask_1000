import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// GET - Get conversation note
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
      .select('note')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation note:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversation note', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note: conversation?.note || ''
    });

  } catch (error) {
    console.error('Error in GET conversation note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update conversation note
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation_id, note } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'Missing conversation_id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('iv_conversations')
      .update({ note })
      .eq('id', conversation_id);

    if (error) {
      console.error('Error updating conversation note:', error);
      return NextResponse.json(
        { error: 'Failed to update conversation note', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error in PUT conversation note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 