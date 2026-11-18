import { NextResponse } from 'next/server';
import { workflowDb, soCampos } from '@/lib/workflowDb';

const semConfig = () =>
  NextResponse.json({ error: 'sem_config', message: 'Faltam WORKFLOW_SUPABASE_URL e WORKFLOW_SUPABASE_SECRET_KEY.' }, { status: 503 });

export async function GET() {
  const db = workflowDb();
  if (!db) return semConfig();
  const { data, error } = await db.from('cnt_pecas').select('*');
  if (error) return NextResponse.json({ error: error.code, message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const db = workflowDb();
  if (!db) return semConfig();
  const body = soCampos(await request.json());
  const { data, error } = await db.from('cnt_pecas').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
  return NextResponse.json(data);
}
