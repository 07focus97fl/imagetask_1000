import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface UpdateData {
  first_pass_completed?: boolean;
  first_pass_by?: number;
  second_pass_completed?: boolean;
  second_pass_by?: number;
  final_pass_locked?: boolean;
  in_progress_by?: number | null;
}

// PUT - Update conversation status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      conversation_id, 
      first_pass_completed, 
      second_pass_completed, 
      final_pass_locked,
      in_progress_by,
      user_id 
    } = body;

    if (!conversation_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing conversation_id or user_id' },
        { status: 400 }
      );
    }

    // Build the update object
    const updateData: UpdateData = {};
    
    if (typeof first_pass_completed === 'boolean') {
      updateData.first_pass_completed = first_pass_completed;
      if (first_pass_completed) {
        updateData.first_pass_by = user_id;
      } else {
        // If setting first pass to false, also clear the user
        updateData.first_pass_by = undefined;
      }
    }
    
    if (typeof second_pass_completed === 'boolean') {
      updateData.second_pass_completed = second_pass_completed;
      if (second_pass_completed) {
        updateData.second_pass_by = user_id;
      } else {
        // If setting second pass to false, also clear the user
        updateData.second_pass_by = undefined;
      }
    }
    
    if (typeof final_pass_locked === 'boolean') {
      updateData.final_pass_locked = final_pass_locked;
    }
    
    if (in_progress_by !== undefined) {
      updateData.in_progress_by = in_progress_by;
    }

    const { error } = await supabase
      .from('iv_conversations')
      .update(updateData)
      .eq('id', conversation_id);

    if (error) {
      console.error('Error updating conversation status:', error);
      return NextResponse.json(
        { error: 'Failed to update conversation status', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error in PUT conversation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 