-- Tipo de produção das ideias · rodar uma vez no SQL Editor do Supabase.
-- rapido  = vídeo de ~7s já gravado + legenda fixa + música
-- fundo   = texto sobre vídeo de background
-- roteiro = parar, gravar o roteiro, editar e postar

alter table ig_ideas add column if not exists production_type text;

alter table ig_ideas drop constraint if exists ig_ideas_production_type_check;
alter table ig_ideas add constraint ig_ideas_production_type_check
  check (production_type in ('rapido', 'fundo', 'roteiro'));
