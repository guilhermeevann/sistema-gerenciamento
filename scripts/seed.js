const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (Mesmas credenciais do .env.local)
const supabaseUrl = 'https://eocnhgznwmzpcciznnbq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY25oZ3pud216cGNjaXpubmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4OTg3NzYsImV4cCI6MjA4NTQ3NDc3Nn0.5unjidX-jLvOn3kEjcWGtiya9VoKDJ7A0QuYuImL3F0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Iniciando preenchimento do banco com dados fictícios...');

  // 1. Limpar dados existentes
  await supabase.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('studies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('weekly_words').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Metas Fictícias
  await supabase.from('goals').insert([
    { title: 'Ler a Bíblia toda em 1 ano', description: 'Leitura diária de 3 a 4 capítulos para fechar a Bíblia.', focus_level: 5 },
    { title: 'Faturar R$ 10k/mês', description: 'Alcançar a meta de faturamento estabilizando os projetos atuais e adquirindo novos clientes.', focus_level: 4 },
    { title: 'Correr 5km sem parar', description: 'Treinar 3x na semana aumentando o fôlego gradativamente.', focus_level: 3 }
  ]);

  // 3. Palavra da Semana
  await supabase.from('weekly_words').insert([
    { word: 'Tudo posso naquele que me fortalece.', description: 'Filipenses 4:13', week_start: new Date().toISOString().split('T')[0] }
  ]);

  // 4. Tarefas (Rotina e Extras)
  await supabase.from('tasks').insert([
    { title: 'Devocional e Oração', type: 'recurring', day_of_week: null },
    { title: 'Estudar Programação (1 hora)', type: 'recurring', day_of_week: null },
    { title: 'Exercício Físico', type: 'recurring', day_of_week: null },
    { title: 'Reunião de Alinhamento Semanal', type: 'extra', day_of_week: 1 }, // Segunda
    { title: 'Culto na Igreja', type: 'extra', day_of_week: 0 }, // Domingo
  ]);

  // 5. Estudos
  await supabase.from('studies').insert([
    { title: 'Teologia Básica', type: 'theme', area: 'Espiritual', progress: 30, insights: 'Deus é soberano. A graça nos alcançou de forma incondicional.' },
    { title: 'Código Limpo (Clean Code)', type: 'book', area: 'Profissional', progress: 65, insights: 'Nomes de variáveis devem revelar intenção. Evite comentários desnecessários, o código deve ser auto-explicativo.' },
    { title: 'O Poder do Hábito', type: 'book', area: 'Desenvolvimento Pessoal', progress: 40, insights: 'O loop do hábito: Deixa > Rotina > Recompensa.' },
  ]);

  console.log('Banco de dados preenchido com sucesso!');
}

seed().catch(console.error);
