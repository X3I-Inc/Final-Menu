import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 
        `${process.env.STRIPE_SECRET_KEY.substring(0, 10)}...` : 'MISSING',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 
        `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 10)}...` : 'MISSING',
      STRIPE_STARTER_MONTHLY_PRICE_ID: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ? 'SET' : 'MISSING',
      STRIPE_STARTER_YEARLY_PRICE_ID: process.env.STRIPE_STARTER_YEARLY_PRICE_ID ? 'SET' : 'MISSING',
      STRIPE_GROWTH_MONTHLY_PRICE_ID: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID ? 'SET' : 'MISSING',
      STRIPE_GROWTH_YEARLY_PRICE_ID: process.env.STRIPE_GROWTH_YEARLY_PRICE_ID ? 'SET' : 'MISSING',
      STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ? 'SET' : 'MISSING',
      STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID ? 'SET' : 'MISSING',
    };

    return NextResponse.json({
      message: 'Stripe environment variables debug',
      environment: process.env.NODE_ENV,
      variables: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug-stripe endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to debug Stripe configuration' },
      { status: 500 }
    );
  }
} 