-- Quarto tipo de produção: carrossel / post estático · rodar uma vez no SQL Editor do Supabase.

alter table ig_ideas drop constraint if exists ig_ideas_production_type_check;
alter table ig_ideas add constraint ig_ideas_production_type_check
  check (production_type in ('rapido', 'fundo', 'roteiro', 'estatico'));
