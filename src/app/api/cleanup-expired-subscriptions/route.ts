import { NextRequest, NextResponse } from 'next/server';
import { cleanupAllExpiredSubscriptions } from '@/lib/subscription-enforcement';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (you can add your own authentication logic here)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_API_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting scheduled cleanup of expired subscriptions...');
    
    const cleanedCount = await cleanupAllExpiredSubscriptions();
    
    console.log(`Cleanup completed. Cleaned ${cleanedCount} expired subscriptions.`);
    
    return NextResponse.json({ 
      success: true, 
      cleanedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also allow GET requests for manual testing
export async function GET(request: NextRequest) {
  try {
    console.log('Manual cleanup request received...');
    
    const cleanedCount = await cleanupAllExpiredSubscriptions();
    
    console.log(`Manual cleanup completed. Cleaned ${cleanedCount} expired subscriptions.`);
    
    return NextResponse.json({ 
      success: true, 
      cleanedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 