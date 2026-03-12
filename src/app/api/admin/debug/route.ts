import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json({
    cronSecretSet: !!process.env.CRON_SECRET,
    cronSecretLength: process.env.CRON_SECRET?.length ?? 0,
    querySecret: searchParams.get('secret'),
    authHeader: request.headers.get('authorization'),
  });
}
