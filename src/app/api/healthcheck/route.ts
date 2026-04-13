import { NextResponse } from 'next/server';

/**
 * Rota de Health Check (Keep Alive)
 * Use este endpoint em serviços como cron-job.org ou uptimerobot.com
 * para manter o seu projeto na Vercel/Render sempre ativo (sem hibernar).
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    message: 'Sistema ativo e pronto para uso!'
  });
}
