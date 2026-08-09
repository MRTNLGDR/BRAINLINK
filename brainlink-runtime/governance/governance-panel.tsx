import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { connectGovernanceEvents, fetchGovernanceSnapshot } from './governance-service';
import type { GovernanceSnapshot } from './governance-types';
import { GOVERNANCE_UPDATED_EVENT } from './governance-types';
import './governance-panel.css';

const governanceQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  },
});

const queryKey = ['brainlink', 'governance', 'snapshot'] as const;
const tabs = ['Resumo', 'Modulos', 'Tarefas', 'Alertas', 'Changelog', 'Logs', 'Documentos'] as const;
type Tab = (typeof tabs)[number];

const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`bl-gov-badge bl-gov-badge--${tone}`}>{children}</span>;
}

function EmptySection({ children }: { children: React.ReactNode }) {
  return <div className="bl-gov-empty">{children}</div>;
}

function Summary({ snapshot }: { snapshot: GovernanceSnapshot }) {
  const cards = [
    ['Progresso', `${snapshot.summary.progressPercent}%`],
    ['Modulos ativos', `${snapshot.summary.activeModules}/${snapshot.summary.totalModules}`],
    ['Tarefas concluidas', `${snapshot.summary.doneTasks}/${snapshot.summary.totalTasks}`],
    ['Pendencias', String(snapshot.summary.pendingTasks)],
    ['Alertas abertos', String(snapshot.summary.openAlerts)],
    ['Documentos', String(snapshot.summary.documents)],
  ];
  return (
    <div className="bl-gov-summary">
      {cards.map(([label, value]) => (
        <article className="bl-gov-stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}

function GovernanceContent({ snapshot, tab }: { snapshot: GovernanceSnapshot; tab: Tab }) {
  if (tab === 'Resumo') {
    const pending = snapshot.tasks.filter(task => task.status !== 'DONE');
    const openAlerts = snapshot.alerts.filter(alert => alert.status !== 'RESOLVED');
    return (
      <div className="bl-gov-stack">
        <Summary snapshot={snapshot} />
        <section className="bl-gov-feature">
          <div>
            <span className="bl-gov-kicker">Estado operacional</span>
            <h3>{snapshot.state === 'READY' ? 'Governanca sincronizada' : 'Governanca requer atencao'}</h3>
            <p>A API e a interface usam a mesma fonte persistente. Nenhum indicador desta tela e preenchido com fallback estatico.</p>
          </div>
          <div className="bl-gov-progress" aria-label={`Progresso ${snapshot.summary.progressPercent}%`}>
            <span style={{ width: `${snapshot.summary.progressPercent}%` }} />
          </div>
        </section>
        <div className="bl-gov-columns">
          <section className="bl-gov-card">
            <header><h3>Proximas tarefas</h3><Badge>{pending.length}</Badge></header>
            {pending.length === 0 ? <EmptySection>Nenhuma tarefa pendente.</EmptySection> : pending.slice(0, 5).map(task => (
              <article className="bl-gov-row" key={task.id}>
                <div><strong>{task.title}</strong><span>{task.id} · {task.owner}</span></div>
                <Badge tone={task.status === 'BLOCKED' ? 'danger' : 'warning'}>{task.status}</Badge>
              </article>
            ))}
          </section>
          <section className="bl-gov-card">
            <header><h3>Alertas em aberto</h3><Badge tone={openAlerts.length ? 'danger' : 'success'}>{openAlerts.length}</Badge></header>
            {openAlerts.length === 0 ? <EmptySection>Nenhum alerta aberto.</EmptySection> : openAlerts.slice(0, 5).map(alert => (
              <article className="bl-gov-row" key={alert.id}>
                <div><strong>{alert.title}</strong><span>{alert.action}</span></div>
                <Badge tone={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'danger' : 'warning'}>{alert.severity}</Badge>
              </article>
            ))}
          </section>
        </div>
      </div>
    );
  }

  if (tab === 'Modulos') return <div className="bl-gov-grid">{snapshot.modules.map(module => (
    <article className="bl-gov-card bl-gov-module" key={module.id}>
      <header><Badge tone={module.status === 'ACTIVE' || module.status === 'DONE' ? 'success' : 'warning'}>{module.status}</Badge><span>{module.progressPercent}%</span></header>
      <h3>{module.name}</h3><p>{module.description}</p><small>{module.id} · {module.owner}</small>
      <div className="bl-gov-progress"><span style={{ width: `${module.progressPercent}%` }} /></div>
    </article>
  ))}</div>;

  if (tab === 'Tarefas') return <DataTable headings={['ID', 'Tarefa', 'Modulo', 'Prioridade', 'Estado', 'Atualizada']} rows={snapshot.tasks.map(task => [task.id, task.title, task.moduleId, task.priority, task.status, dateTime(task.updatedAt)])} />;
  if (tab === 'Alertas') return snapshot.alerts.length ? <DataTable headings={['ID', 'Alerta', 'Severidade', 'Estado', 'Acao', 'Atualizado']} rows={snapshot.alerts.map(alert => [alert.id, alert.title, alert.severity, alert.status, alert.action, dateTime(alert.updatedAt)])} /> : <EmptySection>Nenhum alerta registrado.</EmptySection>;
  if (tab === 'Changelog') return <Timeline entries={snapshot.changelog.map(item => ({ id: item.id, title: `${item.version} · ${item.title}`, detail: item.description, meta: `${dateTime(item.at)}${item.commit ? ` · ${item.commit}` : ''}` }))} />;
  if (tab === 'Logs') return <Timeline entries={snapshot.logs.map(item => ({ id: item.id, title: `${item.level} · ${item.event}`, detail: item.message, meta: `${dateTime(item.at)}${item.actor ? ` · ${item.actor}` : ''}` }))} />;
  return <DataTable headings={['ID', 'Documento', 'Tipo', 'Caminho', 'Estado', 'Atualizado']} rows={snapshot.documents.map(document => [document.id, document.title, document.kind, document.path, document.status, dateTime(document.updatedAt)])} />;
}

function DataTable({ headings, rows }: { headings: string[]; rows: string[][] }) {
  if (!rows.length) return <EmptySection>Nenhum registro disponivel.</EmptySection>;
  return <div className="bl-gov-table-wrap"><table className="bl-gov-table"><thead><tr>{headings.map(heading => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function Timeline({ entries }: { entries: Array<{ id: string; title: string; detail: string; meta: string }> }) {
  return <div className="bl-gov-timeline">{entries.map(entry => <article key={entry.id}><i /><div><strong>{entry.title}</strong><p>{entry.detail}</p><span>{entry.id} · {entry.meta}</span></div></article>)}</div>;
}

function GovernanceView() {
  const [tab, setTab] = useState<Tab>('Resumo');
  const [streamOnline, setStreamOnline] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchGovernanceSnapshot(signal),
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey });
    window.addEventListener(GOVERNANCE_UPDATED_EVENT, refresh);
    const disconnect = connectGovernanceEvents(refresh, setStreamOnline);
    return () => {
      window.removeEventListener(GOVERNANCE_UPDATED_EVENT, refresh);
      disconnect();
    };
  }, [queryClient]);

  const lastUpdate = useMemo(() => query.data ? dateTime(query.data.generatedAt) : null, [query.data]);

  if (query.isPending) return <section className="bl-gov-shell" aria-busy="true"><div className="bl-gov-skeleton bl-gov-skeleton--hero" /><div className="bl-gov-summary">{Array.from({ length: 6 }, (_, index) => <div className="bl-gov-skeleton" key={index} />)}</div></section>;

  if (query.isError || !query.data) return <section className="bl-gov-shell"><div className="bl-gov-error" role="alert"><span>Bridge indisponivel</span><h2>Nao foi possivel ler a governanca real</h2><p>{query.error instanceof Error ? query.error.message : 'Erro desconhecido ao consultar o snapshot.'}</p><button type="button" onClick={() => void query.refetch()}>Tentar novamente</button></div></section>;

  if (query.data.state === 'EMPTY') return <section className="bl-gov-shell"><div className="bl-gov-error"><span>Snapshot vazio</span><h2>A fonte existe, mas ainda nao possui modulos ou tarefas</h2><p>Registre os dados na fonte de governanca e atualize esta tela.</p><button type="button" onClick={() => void query.refetch()}>Atualizar</button></div></section>;

  return (
    <section className="bl-gov-shell">
      <header className="bl-gov-hero">
        <div><span className="bl-gov-kicker">Brainlink control plane</span><h2>Governanca operacional</h2><p>Snapshot persistente, auditavel e sincronizado com o runtime.</p></div>
        <div className="bl-gov-actions"><div className="bl-gov-sync"><i className={streamOnline ? 'is-online' : ''} /><span>{streamOnline ? 'SSE conectado' : 'Polling ativo'}</span></div><Badge tone={query.data.state === 'READY' ? 'success' : 'warning'}>{query.data.state}</Badge><button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Atualizando...' : 'Atualizar agora'}</button></div>
      </header>
      <div className="bl-gov-meta">Atualizado em {lastUpdate} · polling a cada 15 segundos · refetch ao recuperar foco</div>
      <nav className="bl-gov-tabs" aria-label="Secoes de governanca">{tabs.map(item => <button type="button" className={tab === item ? 'is-active' : ''} aria-current={tab === item ? 'page' : undefined} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <GovernanceContent snapshot={query.data} tab={tab} />
    </section>
  );
}

export function GovernancePanel() {
  return <QueryClientProvider client={governanceQueryClient}><GovernanceView /></QueryClientProvider>;
}
