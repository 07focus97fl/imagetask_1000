import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// GET - Get conversation ID from timepoint, couple, and conversation number
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timepoint = searchParams.get('timepoint');
    const couple = searchParams.get('couple');
    const conversation = searchParams.get('conversation');

    console.log(`Looking up conversation: ${timepoint}/${couple}_C${conversation}`);

    if (!timepoint || !couple || !conversation) {
      return NextResponse.json(
        { error: 'Missing required parameters: timepoint, couple, conversation' },
        { status: 400 }
      );
    }

    // First, get the timepoint ID - try both uppercase and lowercase
    let timepointData = null;
    let timepointError = null;
    
    // Try uppercase first
    const { data: timepointDataUpper, error: timepointErrorUpper } = await supabase
      .from('iv_timepoints')
      .select('id, code')
      .eq('code', timepoint)
      .single();

    if (timepointErrorUpper) {
      // Try lowercase
      const { data: timepointDataLower, error: timepointErrorLower } = await supabase
        .from('iv_timepoints')
        .select('id, code')
        .eq('code', timepoint.toLowerCase())
        .single();
      
      timepointData = timepointDataLower;
      timepointError = timepointErrorLower;
    } else {
      timepointData = timepointDataUpper;
      timepointError = timepointErrorUpper;
    }

    if (timepointError || !timepointData) {
      console.error('Error fetching timepoint:', timepointError);
      
      // Let's see what timepoints exist
      const { data: allTimepoints } = await supabase
        .from('iv_timepoints')
        .select('id, code');
      
      console.log('Available timepoints:', allTimepoints);
      
      return NextResponse.json(
        { 
          error: 'Timepoint not found', 
          details: timepointError?.message || 'No timepoint data',
          searched_for: timepoint,
          available_timepoints: allTimepoints?.map(t => t.code)
        },
        { status: 404 }
      );
    }

    console.log(`Found timepoint: ${timepointData.code} (ID: ${timepointData.id})`);

    // Then get the couple ID
    const { data: coupleData, error: coupleError } = await supabase
      .from('iv_couples')
      .select('id, code')
      .eq('timepoint_id', timepointData.id)
      .eq('code', couple)
      .single();

    if (coupleError || !coupleData) {
      console.error('Error fetching couple:', coupleError);
      
      // Let's see what couples exist for this timepoint
      const { data: allCouples } = await supabase
        .from('iv_couples')
        .select('id, code')
        .eq('timepoint_id', timepointData.id);
      
      console.log(`Available couples for timepoint ${timepointData.code}:`, allCouples);
      
      return NextResponse.json(
        { 
          error: 'Couple not found', 
          details: coupleError?.message || 'No couple data',
          searched_for: couple,
          timepoint: timepointData.code,
          available_couples: allCouples?.map(c => c.code)
        },
        { status: 404 }
      );
    }

    console.log(`Found couple: ${coupleData.code} (ID: ${coupleData.id})`);

    // Finally get the conversation ID
    const conversationNumber = parseInt(conversation);
    const { data: conversationData, error: conversationError } = await supabase
      .from('iv_conversations')
      .select('id, convo_number')
      .eq('couple_id', coupleData.id)
      .eq('convo_number', conversationNumber)
      .single();

    if (conversationError || !conversationData) {
      console.error('Error fetching conversation:', conversationError);
      
      // Let's see what conversations exist for this couple
      const { data: allConversations } = await supabase
        .from('iv_conversations')
        .select('id, convo_number')
        .eq('couple_id', coupleData.id);
      
      console.log(`Available conversations for couple ${coupleData.code}:`, allConversations);
      
      return NextResponse.json(
        { 
          error: 'Conversation not found', 
          details: conversationError?.message || 'No conversation data',
          searched_for: conversationNumber,
          couple: coupleData.code,
          available_conversations: allConversations?.map(c => c.convo_number)
        },
        { status: 404 }
      );
    }

    console.log(`Found conversation: ${conversationData.convo_number} (ID: ${conversationData.id})`);

    return NextResponse.json({
      success: true,
      conversation_id: conversationData.id,
      timepoint_id: timepointData.id,
      couple_id: coupleData.id,
      debug: {
        timepoint: timepointData.code,
        couple: coupleData.code,
        conversation: conversationData.convo_number
      }
    });

  } catch (error) {
    console.error('Error in GET conversation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 