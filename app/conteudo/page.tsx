"use client";

import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/components/Toast';
import styles from './conteudo.module.css';
import PecaModal, { Rascunho } from './_components/PecaModal';
import { listar, atualizar } from './api';
import {
  Etapa, Peca, Plataforma, TETO_EDITAR, busca, dataCurta, etapaLabel, etapas, formatoLabel, gravacoes,
  hojeISO, numero, plataformaInfo, plataformas, porPrioridade, proximaEtapa,
} from './types';

type Aba = 'esteira' | 'gravar' | 'calendario' | 'publicado';

export default function Conteudo() {
  const [aba, setAba] = useState<Aba>('esteira');
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const [filtro, setFiltro] = useState<Plataforma | 'todas'>('todas');
  const [q, setQ] = useState('');
  // `key` remonta o modal a cada abertura, para o formulário nascer com os dados da peça.
  const [modal, setModal] = useState<{ open: boolean; peca: Peca | null; rascunho: Rascunho; key: number }>({
    open: false, peca: null, rascunho: {}, key: 0,
  });

  const carregar = async () => {
    const { data, error } = await listar();
    // sem_config: faltam as variáveis do banco da Workflow; PGRST205/42P01: falta a tabela.
    if (error && (error.code === 'sem_config' || error.code === 'PGRST205' || error.code === '42P01')) setSemTabela(true);
    else if (error) showToast('Erro ao carregar o conteúdo.', 'error');
    if (data) setPecas(data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const abrir = (peca: Peca | null, rascunho: Rascunho = {}) =>
    setModal(prev => ({ open: true, peca, rascunho, key: prev.key + 1 }));

  const novoCorte = (mae: Peca) => abrir(null, {
    mae_id: mae.id, titulo: mae.titulo, etapa: 'editar', formato: 'video_curto', plataforma: 'instagram',
    gancho: mae.gancho, cta: mae.cta,
  });

  const visiveis = useMemo(
    () => pecas.filter(p => (filtro === 'todas' || p.plataforma === filtro) && busca(p, q)),
    [pecas, filtro, q],
  );
  const naEtapa = (e: Etapa) => visiveis.filter(p => p.etapa === e).sort(porPrioridade);
  const emEdicao = pecas.filter(p => p.etapa === 'editar').length;

  const avancar = async (p: Peca) => {
    const prox = proximaEtapa(p);
    if (!prox) return;
    const patch: Partial<Peca> = { etapa: prox };
    if (prox === 'publicado' && !p.data) patch.data = hojeISO();
    const { error } = await atualizar(p.id, patch);
    if (error) { showToast('Não moveu: ' + error.message, 'error'); return; }
    if (prox === 'editar' && emEdicao + 1 > TETO_EDITAR) {
      showToast(`Para editar passou do teto: ${emEdicao + 1} de ${TETO_EDITAR}. Termine uma antes de abrir outra.`, 'info');
    } else {
      showToast(`Foi para ${etapaLabel(prox)}.`);
    }
    carregar();
  };

  const cortesDe = (p: Peca) => pecas.filter(c => c.mae_id === p.id);
  const maeDe = (p: Peca) => (p.mae_id ? pecas.find(m => m.id === p.mae_id) ?? null : null);

  const card = (p: Peca) => {
    const info = plataformaInfo(p.plataforma);
    const prox = proximaEtapa(p);
    const mae = maeDe(p);
    const cortes = cortesDe(p);
    return (
      <div key={p.id} className={styles.card} style={{ borderLeftColor: info?.cor ?? 'var(--border-color)' }}>
        <button className={styles.cardBody} onClick={() => abrir(p)}>
          <span className={styles.cardMeta}>
            {info?.label ?? 'Plataforma a definir'}
            {formatoLabel(p.formato) && ` · ${formatoLabel(p.formato)}`}
            {p.prioridade === 1 && p.etapa !== 'publicado' && <span className={styles.agora}>Agora</span>}
          </span>
          <span className={styles.cardTitulo}>{p.titulo}</span>
          {mae && <span className={styles.cardSub}>Corte de: {mae.titulo}</span>}
          {p.data && p.etapa !== 'ideia' && <span className={styles.cardSub}>📅 {dataCurta(p.data)}</span>}
        </button>
        {cortes.length > 0 && (
          <div className={styles.cardCortes}>
            {cortes.map(c => (
              <button key={c.id} className={styles.corteChip} onClick={() => abrir(c)} title={c.titulo}>
                <span className={styles.dot} style={{ background: plataformaInfo(c.plataforma)?.cor ?? 'var(--text-muted)' }} />
                {plataformaInfo(c.plataforma)?.label ?? 'Corte'} · {etapaLabel(c.etapa)}
                {c.data && ` · ${dataCurta(c.data)}`}
              </button>
            ))}
          </div>
        )}
        {prox && (
          <button className={styles.avancar} onClick={() => avancar(p)}>
            → {etapaLabel(prox)}
          </button>
        )}
      </div>
    );
  };

  const esteira = () => (
    <div className={styles.board}>
      {etapas.filter(e => e.value !== 'publicado').map(e => {
        const lista = naEtapa(e.value);
        const estourou = e.value === 'editar' && emEdicao > TETO_EDITAR;
        return (
          <section key={e.value} className={styles.coluna}>
            <header className={styles.colunaHead}>
              <h2 className={styles.colunaTitulo}>
                {e.label}
                {e.value === 'editar'
                  ? <span className={`${styles.count} ${estourou ? styles.countAlerta : ''}`}>{emEdicao} de {TETO_EDITAR}</span>
                  : <span className={styles.count}>{lista.length}</span>}
              </h2>
              <p className={styles.proximo}>Próximo passo: {e.proximo}</p>
              {estourou && <p className={styles.alerta}>Acima do teto. Termine uma antes de abrir outra.</p>}
            </header>
            <div className={styles.colunaLista}>
              {lista.length === 0 && <p className={styles.vazio}>Nada aqui.</p>}
              {lista.map(card)}
            </div>
          </section>
        );
      })}
    </div>
  );

  const gravar = () => {
    const lista = naEtapa('gravar');
    const grupos = [
      ...gravacoes.map(g => ({ titulo: g.label, dica: g.dica, itens: lista.filter(p => p.gravacao === g.value) })),
      { titulo: 'Jeito de gravar a definir', dica: 'escolher na peça', itens: lista.filter(p => !p.gravacao) },
    ].filter(g => g.itens.length);
    return (
      <div className={styles.section}>
        <p className="text-secondary">Tudo o que está pronto para gravar, agrupado pelo jeito de gravar. Grave um grupo de uma vez.</p>
        {grupos.length === 0 && <p className={styles.vazio}>Nada para gravar.</p>}
        {grupos.map(g => (
          <section key={g.titulo} className={styles.grupo}>
            <h2 className={styles.grupoTitulo}>{g.titulo} <span className={styles.count}>{g.itens.length}</span></h2>
            <p className={styles.proximo}>{g.dica}</p>
            <div className={styles.grupoLista}>
              {g.itens.map(p => (
                <div key={p.id} className={styles.gravarLinha}>
                  <button className={styles.gravarTexto} onClick={() => abrir(p)}>
                    <span className={styles.cardTitulo}>
                      {p.prioridade === 1 && <span className={styles.agora}>Agora</span>} {p.titulo}
                    </span>
                    {p.gancho && <span className={styles.cardSub}>Gancho: {p.gancho}</span>}
                  </button>
                  <button className="btn btn-secondary" onClick={() => avancar(p)}>Gravei</button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  };

  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const calendario = () => {
    const ano = mes.getFullYear();
    const m = mes.getMonth();
    const inicio = (new Date(ano, m, 1).getDay() + 6) % 7; // semana começa na segunda
    const dias = new Date(ano, m + 1, 0).getDate();
    const celulas: (number | null)[] = [...Array(inicio).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
    while (celulas.length % 7) celulas.push(null);
    const iso = (d: number) => `${ano}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hoje = hojeISO();
    const semData = visiveis.filter(p => p.etapa === 'postar' && !p.data).length;
    return (
      <div className={styles.section}>
        <div className={styles.calHead}>
          <button className="btn btn-secondary" onClick={() => setMes(new Date(ano, m - 1, 1))} aria-label="Mês anterior">←</button>
          <h2 className={styles.calTitulo}>{mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
          <button className="btn btn-secondary" onClick={() => setMes(new Date(ano, m + 1, 1))} aria-label="Próximo mês">→</button>
        </div>
        {semData > 0 && <p className={styles.alerta}>{semData} peça(s) em Para postar sem data.</p>}
        <div className={styles.calGrid}>
          {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(d => <div key={d} className={styles.calDiaNome}>{d}</div>)}
          {celulas.map((d, i) => (
            <div key={i} className={`${styles.calCelula} ${d && iso(d) === hoje ? styles.calHoje : ''} ${d ? '' : styles.calVazia}`}>
              {d && <span className={styles.calNum}>{d}</span>}
              {d && visiveis.filter(p => p.data === iso(d) && p.etapa !== 'ideia').map(p => (
                <button key={p.id} className={`${styles.calPeca} ${p.etapa === 'publicado' ? styles.calFeita : ''}`}
                  style={{ borderLeftColor: plataformaInfo(p.plataforma)?.cor ?? 'var(--border-color)' }}
                  onClick={() => abrir(p)} title={`${p.titulo} · ${etapaLabel(p.etapa)}`}>
                  {p.titulo}
                </button>
              ))}
            </div>
          ))}
        </div>
        <p className={styles.legenda}>
          {plataformas.map(p => <span key={p.value}><span className={styles.dot} style={{ background: p.cor }} /> {p.label}</span>)}
          <span>Riscado: já publicado</span>
        </p>
      </div>
    );
  };

  const publicado = () => {
    const lista = visiveis.filter(p => p.etapa === 'publicado')
      .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
    return (
      <div className={styles.section}>
        <p className="text-secondary">Dois números por peça, para decidir a próxima. Clique na peça para anotar.</p>
        {lista.length === 0 && <p className={styles.vazio}>Nada publicado ainda.</p>}
        <div className={styles.tabela}>
          {lista.map(p => {
            const info = plataformaInfo(p.plataforma);
            return (
              <button key={p.id} className={styles.pubLinha} onClick={() => abrir(p)}>
                <span className={styles.dot} style={{ background: info?.cor ?? 'var(--text-muted)' }} />
                <span className={styles.pubData}>{dataCurta(p.data) ?? '—'}</span>
                <span className={styles.pubTitulo}>{p.titulo}</span>
                <span className={styles.pubNum}><small>{info?.numeros[0] ?? 'Nº 1'}</small>{numero(p.numero1)}</span>
                <span className={styles.pubNum}><small>{info?.numeros[1] ?? 'Nº 2'}</small>{numero(p.numero2)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const abas: { id: Aba; label: string; n: number }[] = [
    { id: 'esteira', label: 'Esteira', n: visiveis.filter(p => p.etapa !== 'publicado').length },
    { id: 'gravar', label: 'Gravar', n: naEtapa('gravar').length },
    { id: 'calendario', label: 'Calendário', n: visiveis.filter(p => p.data && p.etapa !== 'ideia' && p.etapa !== 'publicado').length },
    { id: 'publicado', label: 'Publicado', n: visiveis.filter(p => p.etapa === 'publicado').length },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className="h2">Conteúdo</h1>
          <p className="text-secondary">YouTube, Instagram e LinkedIn numa esteira só. A peça-mãe gera os cortes.</p>
        </div>
        {!semTabela && <button className="btn btn-primary" onClick={() => abrir(null)}>+ Nova peça</button>}
      </header>

      {loading ? (
        <p className="text-secondary">Carregando...</p>
      ) : semTabela ? (
        <div className={`${styles.setupBox} glass-panel`}>
          <h3>Falta ligar o banco da Workflow</h3>
          <p className="text-secondary">
            A esteira mora no Supabase da Workflow. Defina <code>WORKFLOW_SUPABASE_URL</code> e <code>WORKFLOW_SUPABASE_SECRET_KEY</code>
            no <code>.env.local</code> (e nas variáveis da Vercel) e confira se <code>supabase/conteudo.sql</code> já rodou lá.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <nav className={styles.tabs}>
              {abas.map(a => (
                <button key={a.id} className={`${styles.tab} ${aba === a.id ? styles.tabActive : ''}`} onClick={() => setAba(a.id)}>
                  {a.label} <span className={styles.tabCount}>{a.n}</span>
                </button>
              ))}
            </nav>
            <div className={styles.filtros}>
              {(['todas', ...plataformas.map(p => p.value)] as const).map(f => (
                <button key={f} className={`${styles.chip} ${filtro === f ? styles.chipAtivo : ''}`} onClick={() => setFiltro(f)}>
                  {f === 'todas' ? 'Todas' : plataformaInfo(f)!.label}
                </button>
              ))}
              {aba === 'esteira' && (
                <input className={styles.busca} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." aria-label="Buscar peça" />
              )}
            </div>
          </div>

          {aba === 'esteira' && esteira()}
          {aba === 'gravar' && gravar()}
          {aba === 'calendario' && calendario()}
          {aba === 'publicado' && publicado()}
        </>
      )}

      <PecaModal
        key={modal.key}
        isOpen={modal.open}
        peca={modal.peca}
        rascunho={modal.rascunho}
        pecas={pecas}
        onClose={() => setModal(prev => ({ ...prev, open: false }))}
        onSaved={carregar}
        onNovoCorte={novoCorte}
        onAbrir={p => abrir(p)}
      />
    </div>
  );
}
