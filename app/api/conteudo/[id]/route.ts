import { NextRequest, NextResponse } from 'next/server';
import { workflowDb, soCampos } from '@/lib/workflowDb';

const semConfig = () =>
  NextResponse.json({ error: 'sem_config', message: 'Faltam WORKFLOW_SUPABASE_URL e WORKFLOW_SUPABASE_SECRET_KEY.' }, { status: 503 });

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = workflowDb();
  if (!db) return semConfig();
  const { id } = await ctx.params;
  const body = soCampos(await request.json());
  const { error } = await db.from('cnt_pecas').update(body).eq('id', id);
  if (error) return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const db = workflowDb();
  if (!db) return semConfig();
  const { id } = await ctx.params;
  const { error } = await db.from('cnt_pecas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
