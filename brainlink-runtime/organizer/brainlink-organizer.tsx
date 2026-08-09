import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useService } from '@toeverything/infra';
import { type FormEvent, useState } from 'react';

import { createBrainlinkId } from './store';
import type { BrainlinkState } from './types';

export type BrainlinkOrganizerView =
  | 'organization'
  | 'life'
  | 'ideas'
  | 'company'
  | 'budget'
  | 'people'
  | 'brains';

type EntityKind = 'LIFE' | 'IDEA' | 'PROJECT' | 'COMPANY' | 'BUDGET' | 'TASK' | 'PERSON';
type EntityStatus = 'CAPTURED' | 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'DONE';

type OrganizerEntity = {
  id: string;
  kind: EntityKind;
  title: string;
  description: string;
  status: EntityStatus;
  ownerType?: 'PERSON' | 'BRAIN';
  ownerId?: string;
  documentId?: string;
  budgetPlanned: number;
  budgetSpent: number;
  createdAt: string;
  updatedAt: string;
};

type DocumentRead = { workerId: string; documentId: string; readAt: string };
type WorkerActivity = { id: string; workerId: string; action: string; detail: string; at: string };
type OrganizerState = {
  schemaVersion: 1;
  entities: OrganizerEntity[];
  documentReads: DocumentRead[];
  activity: WorkerActivity[];
};
type Commit = (action: string, detail: string, mutate: (draft: BrainlinkState) => void) => void;
type Props = {
  view: BrainlinkOrganizerView;
  state: BrainlinkState;
  commit: Commit;
  onNavigate: (slug: string) => void;
};

const STORAGE_KEY = 'brainlink:organizer:v1';
const emptyState = (): OrganizerState => ({ schemaVersion: 1, entities: [], documentReads: [], activity: [] });
const readState = (): OrganizerState => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<OrganizerState> | null;
    if (!value || value.schemaVersion !== 1) return emptyState();
    return {
      schemaVersion: 1,
      entities: Array.isArray(value.entities) ? value.entities : [],
      documentReads: Array.isArray(value.documentReads) ? value.documentReads : [],
      activity: Array.isArray(value.activity) ? value.activity : [],
    };
  } catch {
    return emptyState();
  }
};

const styles = `
  .bl-org { display:flex;flex-direction:column;gap:12px; }
  .bl-org-kpis { display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px; }
  .bl-org-kpi { min-width:0;padding:13px 14px;background:#191919;border:1px solid #303030;border-radius:9px; }
  .bl-org-kpi span { display:block;color:#777;font-size:8px;font-weight:650;letter-spacing:.06em;text-transform:uppercase; }
  .bl-org-kpi strong { display:block;margin-top:8px;color:#eee;font-size:21px;font-weight:620;letter-spacing:-.04em; }
  .bl-org-domain-grid { display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px; }
  .bl-org-domain { min-height:88px;padding:12px;color:#aaa;background:#171717;border:1px solid #2c2c2c;border-radius:9px;text-align:left;cursor:pointer; }
  .bl-org-domain:hover { color:#eee;background:#202020;border-color:#414141; }
  .bl-org-domain b { display:block;color:inherit;font-size:11px; }
  .bl-org-domain small { display:block;margin-top:6px;color:#747474;font-size:8px;line-height:1.45; }
  .bl-org-domain em { display:block;margin-top:9px;color:#8fd3bf;font-size:9px;font-style:normal;font-weight:650; }
  .bl-org-layout { display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:12px;align-items:start; }
  .bl-org-panel { padding:15px;background:#191919;border:1px solid #303030;border-radius:10px; }
  .bl-org-panel h2 { margin:0;color:#d8d8d8;font-size:12px;font-weight:620; }
  .bl-org-panel > p { margin:5px 0 13px;color:#777;font-size:9px;line-height:1.55; }
  .bl-org-form { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px; }
  .bl-org-field { min-width:0; }
  .bl-org-field[data-span="2"] { grid-column:span 2; }
  .bl-org-field label { display:block;margin-bottom:5px;color:#777;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:.05em; }
  .bl-org-field input,.bl-org-field textarea,.bl-org-field select { width:100%;padding:8px 9px;color:#ddd;background:#131313;border:1px solid #303030;border-radius:6px;outline:0;font:inherit;font-size:10px; }
  .bl-org-field textarea { min-height:70px;resize:vertical; }
  .bl-org-field input:focus,.bl-org-field textarea:focus,.bl-org-field select:focus { border-color:#555; }
  .bl-org-button { min-height:31px;padding:6px 9px;color:#aaa;background:#222;border:1px solid #373737;border-radius:6px;font:inherit;font-size:9px;cursor:pointer; }
  .bl-org-button:hover { color:#eee;background:#292929; }
  .bl-org-button[data-primary="true"] { color:#101715;background:#a7dccd;border-color:#a7dccd;font-weight:650; }
  .bl-org-entities { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px; }
  .bl-org-entity { min-width:0;padding:13px;background:#171717;border:1px solid #2d2d2d;border-radius:9px; }
  .bl-org-entity-head { display:flex;align-items:flex-start;justify-content:space-between;gap:8px; }
  .bl-org-entity h3 { margin:0;color:#d8d8d8;font-size:11px;font-weight:600; }
  .bl-org-entity p { min-height:28px;margin:6px 0 0;color:#777;font-size:9px;line-height:1.5; }
  .bl-org-meta { display:flex;flex-wrap:wrap;gap:5px;margin-top:10px; }
  .bl-org-pill { display:inline-flex;align-items:center;min-height:19px;padding:3px 6px;color:#888;background:#202020;border:1px solid #343434;border-radius:999px;font-size:8px; }
  .bl-org-pill[data-good="true"] { color:#82cdb4;border-color:rgba(130,205,180,.28); }
  .bl-org-pill[data-warn="true"] { color:#e0b875;border-color:rgba(224,184,117,.28); }
  .bl-org-actions { display:flex;flex-wrap:wrap;gap:6px;margin-top:11px; }
  .bl-org-empty { padding:24px;color:#777;border:1px dashed #383838;border-radius:8px;text-align:center;font-size:10px; }
  .bl-brain-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
  .bl-brain { min-width:0;padding:15px;background:#171717;border:1px solid #303030;border-radius:10px; }
  .bl-brain-head { display:flex;align-items:center;justify-content:space-between;gap:10px; }
  .bl-brain-identity { display:flex;align-items:center;gap:9px; }
  .bl-brain-mark { width:28px;height:28px;display:grid;place-items:center;color:#101715;background:#a7dccd;border-radius:8px;font-size:10px;font-weight:750; }
  .bl-brain h3 { margin:0;color:#e5e5e5;font-size:11px; }
  .bl-brain h3 small { display:block;margin-top:3px;color:#747474;font-size:8px;font-weight:500; }
  .bl-brain-status { padding:4px 7px;color:#8fd3bf;background:rgba(143,211,191,.07);border:1px solid rgba(143,211,191,.2);border-radius:999px;font-size:8px; }
  .bl-brain-facts { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:13px; }
  .bl-brain-fact { min-width:0;padding:9px;background:#131313;border-radius:7px; }
  .bl-brain-fact span { display:block;color:#6f6f6f;font-size:7px;font-weight:650;text-transform:uppercase;letter-spacing:.06em; }
  .bl-brain-fact strong { display:block;overflow:hidden;margin-top:5px;color:#bbb;font-size:9px;font-weight:550;text-overflow:ellipsis;white-space:nowrap; }
  .bl-brain-compliance { margin-top:12px; }
  .bl-brain-compliance-head { display:flex;justify-content:space-between;color:#777;font-size:8px; }
  .bl-brain-progress { height:5px;margin-top:6px;overflow:hidden;background:#0f0f0f;border-radius:999px; }
  .bl-brain-progress span { display:block;height:100%;background:#82cdb4;border-radius:inherit; }
  .bl-activity { display:flex;flex-direction:column;gap:6px; }
  .bl-activity-row { padding:9px;background:#151515;border:1px solid #292929;border-radius:7px; }
  .bl-activity-row strong { color:#aaa;font-size:9px; }
  .bl-activity-row small { display:block;margin-top:3px;color:#707070;font-size:8px;line-height:1.4; }
  .bl-doc-matrix { width:100%;border-collapse:collapse;font-size:9px; }
  .bl-doc-matrix th,.bl-doc-matrix td { padding:8px;border-bottom:1px solid #292929;text-align:left; }
  .bl-doc-matrix th { color:#707070;font-weight:600; }
  .bl-doc-matrix td { color:#aaa; }
  @media(max-width:1200px){.bl-org-kpis{grid-template-columns:repeat(3,1fr)}.bl-org-domain-grid{grid-template-columns:repeat(4,1fr)}}
  @media(max-width:820px){.bl-org-layout{grid-template-columns:1fr}.bl-brain-grid,.bl-org-entities{grid-template-columns:1fr}.bl-org-domain-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){.bl-org-kpis{grid-template-columns:repeat(2,1fr)}.bl-org-form{grid-template-columns:1fr}.bl-org-field[data-span="2"]{grid-column:auto}}
`;

const routeKind: Partial<Record<BrainlinkOrganizerView, EntityKind>> = {
  life: 'LIFE', ideas: 'IDEA', company: 'COMPANY', budget: 'BUDGET', people: 'PERSON',
};
const domains: Array<{ label: string; slug: BrainlinkOrganizerView; kind?: EntityKind; detail: string }> = [
  { label: 'Life', slug: 'life', kind: 'LIFE', detail: 'Goals, routines and personal areas.' },
  { label: 'Ideas', slug: 'ideas', kind: 'IDEA', detail: 'Capture, mature and connect ideas.' },
  { label: 'Projects', slug: 'organization', kind: 'PROJECT', detail: 'Outcomes, owners and execution.' },
  { label: 'Company', slug: 'company', kind: 'COMPANY', detail: 'Operations, teams and processes.' },
  { label: 'Budget', slug: 'budget', kind: 'BUDGET', detail: 'Planned and actual resources.' },
  { label: 'People', slug: 'people', kind: 'PERSON', detail: 'People, roles and relationships.' },
  { label: 'Brains', slug: 'brains', detail: 'AI Workers, activity and compliance.' },
];
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
const nextStatus = (status: EntityStatus): EntityStatus => ({ CAPTURED: 'PLANNED', PLANNED: 'ACTIVE', ACTIVE: 'DONE', PAUSED: 'ACTIVE', DONE: 'DONE' })[status] as EntityStatus;

export const BrainlinkOrganizer = ({ view, state, commit, onNavigate }: Props) => {
  const workspaceService = useService(WorkspaceService);
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const workbench = useService(WorkbenchService).workbench;
  const [organizer, setOrganizer] = useState<OrganizerState>(readState);
  const [kind, setKind] = useState<EntityKind>(routeKind[view] ?? 'PROJECT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [budgetPlanned, setBudgetPlanned] = useState('');
  const [budgetSpent, setBudgetSpent] = useState('');

  const documents = Array.from(workspaceService.workspace.docCollection.docs.values()).flatMap(handle => {
    const store = handle.getStore();
    return store ? [{ id: store.id, title: docDisplayMetaService.title$(store.id).value || 'Untitled document' }] : [];
  });
  const documentMap = new Map(documents.map(document => [document.id, document.title]));
  const workerMap = new Map(state.workers.map(worker => [worker.id, worker]));
  const projectMap = new Map(state.projects.map(project => [project.id, project]));
  const taskMap = new Map(state.tasks.map(task => [task.id, task]));
  const routeFilter = routeKind[view];
  const visibleEntities = organizer.entities.filter(entity => !routeFilter || entity.kind === routeFilter);
  const planned = organizer.entities.reduce((sum, entity) => sum + entity.budgetPlanned, 0);
  const spent = organizer.entities.reduce((sum, entity) => sum + entity.budgetSpent, 0);
  const documented = organizer.entities.filter(entity => entity.documentId).length;
  const active = organizer.entities.filter(entity => entity.status === 'ACTIVE').length;
  const openTasks = state.tasks.filter(task => task.status !== 'DONE').length;

  const updateOrganizer = (mutate: (current: OrganizerState) => OrganizerState) => setOrganizer(current => {
    const next = mutate(current);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  });
  const activity = (workerId: string, action: string, detail: string) => updateOrganizer(current => ({
    ...current,
    activity: [{ id: createBrainlinkId('ACT'), workerId, action, detail, at: new Date().toISOString() }, ...current.activity].slice(0, 250),
  }));

  const createEntity = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const now = new Date().toISOString();
    const ownerType = owner.startsWith('WORKER:') ? 'BRAIN' : owner.startsWith('PERSON:') ? 'PERSON' : undefined;
    const entity: OrganizerEntity = {
      id: createBrainlinkId('ORG'), kind, title: title.trim(), description: description.trim(),
      status: kind === 'IDEA' ? 'CAPTURED' : 'PLANNED', ownerType,
      ownerId: owner.includes(':') ? owner.split(':')[1] : undefined,
      documentId: documentId || undefined,
      budgetPlanned: Math.max(0, Number(budgetPlanned) || 0),
      budgetSpent: Math.max(0, Number(budgetSpent) || 0), createdAt: now, updatedAt: now,
    };
    updateOrganizer(current => ({ ...current, entities: [entity, ...current.entities] }));
    setTitle(''); setDescription(''); setOwner(''); setDocumentId(''); setBudgetPlanned(''); setBudgetSpent('');
  };
  const advanceEntity = (id: string) => updateOrganizer(current => ({ ...current, entities: current.entities.map(entity => entity.id === id ? { ...entity, status: nextStatus(entity.status), updatedAt: new Date().toISOString() } : entity) }));
  const archiveEntity = (id: string) => updateOrganizer(current => ({ ...current, entities: current.entities.filter(entity => entity.id !== id) }));

  const acknowledgeWorkerDocuments = (workerId: string) => {
    const assigned = organizer.entities.filter(entity => entity.ownerType === 'BRAIN' && entity.ownerId === workerId && entity.documentId);
    const now = new Date().toISOString();
    updateOrganizer(current => {
      const reads = [...current.documentReads];
      for (const entity of assigned) if (entity.documentId && !reads.some(read => read.workerId === workerId && read.documentId === entity.documentId)) reads.unshift({ workerId, documentId: entity.documentId, readAt: now });
      return { ...current, documentReads: reads };
    });
    const worker = workerMap.get(workerId);
    if (!worker) return;
    commit('BRAIN_DOCUMENTATION_ACKNOWLEDGED', `${worker.name} acknowledged mandatory Brainlink documentation.`, draft => {
      for (const law of draft.laws.filter(law => law.enabled && law.mandatory)) {
        if (!draft.receipts.some(receipt => receipt.actor === worker.name && receipt.lawId === law.id && receipt.lawVersion === law.version)) draft.receipts.unshift({ id: createBrainlinkId('RCPT'), lawId: law.id, lawVersion: law.version, actor: worker.name, readAt: now });
      }
    });
    activity(workerId, 'DOCUMENTATION_ACKNOWLEDGED', `${assigned.length} linked workspace documents checked.`);
  };
  const startWorker = (workerId: string) => {
    const worker = workerMap.get(workerId); if (!worker) return;
    const now = new Date().toISOString();
    commit('BRAIN_WORK_STARTED', `${worker.name} started governed work.`, draft => {
      const target = draft.workers.find(item => item.id === workerId); if (!target) return;
      target.status = 'RUNNING'; target.lastHeartbeat = now;
      const task = draft.tasks.find(item => item.id === target.currentTaskId);
      if (task && task.status !== 'DONE') { task.status = 'IN_PROGRESS'; task.updatedAt = now; }
    });
    activity(workerId, 'WORK_STARTED', taskMap.get(worker.currentTaskId ?? '')?.title ?? 'No task assigned.');
  };
  const pauseWorker = (workerId: string) => {
    const worker = workerMap.get(workerId); if (!worker) return;
    commit('BRAIN_WORK_PAUSED', `${worker.name} paused execution.`, draft => { const target = draft.workers.find(item => item.id === workerId); if (target) target.status = 'PAUSED'; });
    activity(workerId, 'WORK_PAUSED', 'Execution paused by operator.');
  };
  const checkpointWorker = (workerId: string) => {
    const worker = workerMap.get(workerId); if (!worker) return;
    const task = taskMap.get(worker.currentTaskId ?? ''); const now = new Date().toISOString();
    commit('BRAIN_CHECKPOINT_RECORDED', `${worker.name} recorded a work checkpoint.`, draft => {
      const target = draft.workers.find(item => item.id === workerId); if (target) target.lastHeartbeat = now;
      draft.evidence.unshift({ id: createBrainlinkId('EVID'), type: 'CHECKPOINT', title: `${worker.name} checkpoint`, detail: task ? `Active task: ${task.title}.` : 'Heartbeat checkpoint without assigned task.', actor: worker.name, taskId: task?.id, createdAt: now });
    });
    activity(workerId, 'CHECKPOINT', task?.title ?? 'No task assigned.');
  };

  const renderBrains = () => <div className="bl-org">
    <div className="bl-brain-grid">{state.workers.map(worker => {
      const task = taskMap.get(worker.currentTaskId ?? ''); const project = task?.projectId ? projectMap.get(task.projectId) : undefined;
      const assigned = organizer.entities.filter(entity => entity.ownerType === 'BRAIN' && entity.ownerId === worker.id);
      const assignedDocs = [...new Set(assigned.flatMap(entity => entity.documentId ? [entity.documentId] : []))];
      const docsRead = assignedDocs.filter(id => organizer.documentReads.some(read => read.workerId === worker.id && read.documentId === id)).length;
      const mandatoryLaws = state.laws.filter(law => law.enabled && law.mandatory);
      const lawsRead = mandatoryLaws.filter(law => state.receipts.some(receipt => receipt.actor === worker.name && receipt.lawId === law.id && receipt.lawVersion === law.version)).length;
      const totalGates = assignedDocs.length + mandatoryLaws.length;
      const compliance = totalGates ? Math.round(((docsRead + lawsRead) / totalGates) * 100) : 100;
      const latest = organizer.activity.find(item => item.workerId === worker.id);
      const evidence = state.evidence.filter(item => item.actor === worker.name || item.taskId === worker.currentTaskId).length;
      return <article className="bl-brain" key={worker.id}><div className="bl-brain-head"><div className="bl-brain-identity"><span className="bl-brain-mark">B</span><h3>{worker.name}<small>{worker.role}</small></h3></div><span className="bl-brain-status">{worker.status}</span></div>
        <div className="bl-brain-facts"><div className="bl-brain-fact"><span>Assigned task</span><strong>{task?.title ?? 'Unassigned'}</strong></div><div className="bl-brain-fact"><span>Project</span><strong>{project?.name ?? 'No project'}</strong></div><div className="bl-brain-fact"><span>Actually doing</span><strong>{latest?.detail ?? (worker.status === 'RUNNING' ? task?.title : 'No activity recorded')}</strong></div><div className="bl-brain-fact"><span>Last heartbeat</span><strong>{worker.lastHeartbeat ? new Date(worker.lastHeartbeat).toLocaleString() : 'Never'}</strong></div><div className="bl-brain-fact"><span>Workspace docs</span><strong>{docsRead}/{assignedDocs.length} acknowledged</strong></div><div className="bl-brain-fact"><span>Evidence</span><strong>{evidence} records</strong></div></div>
        <div className="bl-brain-compliance"><div className="bl-brain-compliance-head"><span>Documentation compliance</span><strong>{compliance}%</strong></div><div className="bl-brain-progress"><span style={{ width: `${compliance}%` }} /></div></div>
        <div className="bl-org-actions"><button className="bl-org-button" data-primary="true" onClick={() => startWorker(worker.id)}>Start</button><button className="bl-org-button" onClick={() => checkpointWorker(worker.id)}>Checkpoint</button><button className="bl-org-button" onClick={() => acknowledgeWorkerDocuments(worker.id)}>Acknowledge docs</button><button className="bl-org-button" onClick={() => pauseWorker(worker.id)}>Pause</button></div></article>;
    })}{!state.workers.length ? <div className="bl-org-empty">No Brains registered. Create a Worker in governance before assigning work.</div> : null}</div>
    <div className="bl-org-panel"><h2>Live activity</h2><p>What Brains are actually doing, derived from starts, pauses, checkpoints and documentation receipts.</p><div className="bl-activity">{organizer.activity.slice(0, 20).map(item => <div className="bl-activity-row" key={item.id}><strong>{workerMap.get(item.workerId)?.name ?? item.workerId} · {item.action}</strong><small>{item.detail} · {new Date(item.at).toLocaleString()}</small></div>)}{!organizer.activity.length ? <div className="bl-org-empty">No Brain activity recorded yet.</div> : null}</div></div>
  </div>;
  const renderDocumentMatrix = () => <div className="bl-org-panel"><h2>Documentation control</h2><p>Real Brainlink documents linked to organizational work and assigned Brains.</p><table className="bl-doc-matrix"><thead><tr><th>Work</th><th>Document</th><th>Owner</th><th>Gate</th></tr></thead><tbody>{organizer.entities.map(entity => <tr key={entity.id}><td>{entity.title}</td><td>{entity.documentId ? <button className="bl-org-button" onClick={() => workbench.open('/' + entity.documentId)}>{documentMap.get(entity.documentId) ?? entity.documentId}</button> : 'Missing documentation'}</td><td>{entity.ownerType === 'BRAIN' ? workerMap.get(entity.ownerId ?? '')?.name : entity.ownerId ?? 'Unassigned'}</td><td><span className="bl-org-pill" data-good={Boolean(entity.documentId)} data-warn={!entity.documentId}>{entity.documentId ? 'LINKED' : 'GAP'}</span></td></tr>)}</tbody></table>{!organizer.entities.length ? <div className="bl-org-empty">Create organizational work to establish documentation gates.</div> : null}</div>;
  const ownerName = (entity: OrganizerEntity) => entity.ownerType === 'BRAIN' ? workerMap.get(entity.ownerId ?? '')?.name : entity.ownerId;
  if (view === 'brains') return <><style>{styles}</style>{renderBrains()}</>;

  return <><style>{styles}</style><div className="bl-org" data-brainlink-organizer={view}>
    <div className="bl-org-kpis"><div className="bl-org-kpi"><span>Organized items</span><strong>{organizer.entities.length}</strong></div><div className="bl-org-kpi"><span>Active</span><strong>{active}</strong></div><div className="bl-org-kpi"><span>Open tasks</span><strong>{openTasks}</strong></div><div className="bl-org-kpi"><span>Brains</span><strong>{state.workers.filter(worker => worker.status === 'RUNNING').length}/{state.workers.length}</strong></div><div className="bl-org-kpi"><span>Documented</span><strong>{organizer.entities.length ? Math.round((documented / organizer.entities.length) * 100) : 100}%</strong></div><div className="bl-org-kpi"><span>Budget balance</span><strong>{money(planned - spent)}</strong></div></div>
    {view === 'organization' ? <div className="bl-org-domain-grid">{domains.map(domain => { const count = domain.kind ? organizer.entities.filter(entity => entity.kind === domain.kind).length : state.workers.length; return <button className="bl-org-domain" key={domain.slug} onClick={() => onNavigate(domain.slug)}><b>{domain.label}</b><small>{domain.detail}</small><em>{count} records</em></button>; })}</div> : null}
    <div className="bl-org-layout"><section className="bl-org-panel"><h2>{view === 'organization' ? 'Everything in one system' : `Organize ${view}`}</h2><p>Capture real information, assign a person or Brain, link source documentation and track resources.</p><div className="bl-org-entities">{visibleEntities.map(entity => <article className="bl-org-entity" key={entity.id}><div className="bl-org-entity-head"><h3>{entity.title}</h3><span className="bl-org-pill" data-good={entity.status === 'DONE'}>{entity.status}</span></div><p>{entity.description || 'No description recorded.'}</p><div className="bl-org-meta"><span className="bl-org-pill">{entity.kind}</span><span className="bl-org-pill">{ownerName(entity) ?? 'UNASSIGNED'}</span><span className="bl-org-pill" data-good={Boolean(entity.documentId)} data-warn={!entity.documentId}>{entity.documentId ? 'DOC LINKED' : 'DOC GAP'}</span>{entity.budgetPlanned ? <span className="bl-org-pill">{money(entity.budgetSpent)} / {money(entity.budgetPlanned)}</span> : null}</div><div className="bl-org-actions">{entity.status !== 'DONE' ? <button className="bl-org-button" data-primary="true" onClick={() => advanceEntity(entity.id)}>Advance</button> : null}{entity.documentId ? <button className="bl-org-button" onClick={() => workbench.open('/' + entity.documentId)}>Open document</button> : null}<button className="bl-org-button" onClick={() => archiveEntity(entity.id)}>Archive</button></div></article>)}{!visibleEntities.length ? <div className="bl-org-empty">No records in this area. Use the form to create the first real item.</div> : null}</div></section>
      <aside className="bl-org-panel"><h2>New organized item</h2><p>No placeholder is created. Submitting persists a real local-first record.</p><form className="bl-org-form" onSubmit={createEntity}><div className="bl-org-field"><label>Area</label><select value={kind} onChange={event => setKind(event.target.value as EntityKind)}><option value="LIFE">Life</option><option value="IDEA">Idea</option><option value="PROJECT">Project</option><option value="COMPANY">Company</option><option value="BUDGET">Budget</option><option value="TASK">Task</option><option value="PERSON">Person</option></select></div><div className="bl-org-field"><label>Owner</label><select value={owner} onChange={event => setOwner(event.target.value)}><option value="">Unassigned</option>{state.workers.map(worker => <option value={`WORKER:${worker.id}`} key={worker.id}>Brain · {worker.name}</option>)}{organizer.entities.filter(entity => entity.kind === 'PERSON').map(person => <option value={`PERSON:${person.id}`} key={person.id}>Person · {person.title}</option>)}</select></div><div className="bl-org-field" data-span="2"><label>Title</label><input value={title} onChange={event => setTitle(event.target.value)} placeholder="What must be organized?" /></div><div className="bl-org-field" data-span="2"><label>Description</label><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Outcome, context, responsibility and constraints" /></div><div className="bl-org-field" data-span="2"><label>Brainlink source document</label><select value={documentId} onChange={event => setDocumentId(event.target.value)}><option value="">Documentation gap</option>{documents.map(document => <option value={document.id} key={document.id}>{document.title}</option>)}</select></div><div className="bl-org-field"><label>Budget planned</label><input type="number" min="0" value={budgetPlanned} onChange={event => setBudgetPlanned(event.target.value)} /></div><div className="bl-org-field"><label>Budget spent</label><input type="number" min="0" value={budgetSpent} onChange={event => setBudgetSpent(event.target.value)} /></div><div className="bl-org-field" data-span="2"><button className="bl-org-button" data-primary="true">Create and persist</button></div></form></aside></div>
    {view === 'organization' || view === 'company' ? renderDocumentMatrix() : null}{view === 'organization' ? renderBrains() : null}
  </div></>;
};
