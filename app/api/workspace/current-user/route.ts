import { NextRequest, NextResponse } from 'next/server';

// GET - Get current user (for now, we'll return a mock user)
export async function GET(request: NextRequest) {
  try {
    // Get user session from cookie
    const userSession = request.cookies.get('user_session');
    
    if (!userSession) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userSession.value);
    
    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Failed to get user session' },
      { status: 500 }
    );
  }
} 