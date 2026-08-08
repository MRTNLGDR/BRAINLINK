export type BrainlinkArea = 'CORE' | 'SUPERADMIN' | 'MOBILE';

export interface BrainlinkScreenDefinition {
  id: string;
  area: BrainlinkArea;
  label: string;
  slug: string;
  description: string;
}

export const BRAINLINK_SCREENS: BrainlinkScreenDefinition[] = [
  { id: 'BL-UI-001', area: 'CORE', label: 'Project World', slug: 'world', description: 'Mapa operacional de projetos, saúde e progresso.' },
  { id: 'BL-UI-002', area: 'CORE', label: 'Documents', slug: 'documents', description: 'Documentos e conhecimento usando a superfície AFFiNE.' },
  { id: 'BL-UI-003', area: 'CORE', label: 'Canvas', slug: 'canvas', description: 'Canvas visual usando BlockSuite/AFFiNE.' },
  { id: 'BL-UI-004', area: 'CORE', label: 'Projects', slug: 'projects', description: 'Projetos, ownership, saúde e progresso.' },
  { id: 'BL-UI-005', area: 'CORE', label: 'Universalis', slug: 'universalis', description: 'Leis, versões, escopo, precedência e recibos de leitura.' },
  { id: 'BL-UI-006', area: 'CORE', label: 'Governance', slug: 'governance', description: 'Estado de governança em tempo real, approvals e riscos.' },
  { id: 'BL-UI-007', area: 'CORE', label: 'Roadmap', slug: 'roadmap', description: 'Roadmap derivado de tarefas reais e dependências.' },
  { id: 'BL-UI-008', area: 'CORE', label: 'Tasks', slug: 'tasks', description: 'Tasks, estados, donos, prazo e evidence gate.' },
  { id: 'BL-UI-009', area: 'CORE', label: 'Workers', slug: 'workers', description: 'Workers, read gates, heartbeat, execução e checkpoints.' },
  { id: 'BL-UI-010', area: 'CORE', label: 'Bug Book', slug: 'bug-book', description: 'Bugs recorrentes, causas e soluções verificadas.' },
  { id: 'BL-UI-011', area: 'CORE', label: 'Archetypes', slug: 'archetypes', description: 'Prompt archetypes reutilizáveis e versionáveis.' },
  { id: 'BL-UI-012', area: 'CORE', label: 'Connections', slug: 'connections', description: 'MCP, Git, filesystem e APIs por referência, sem segredos em contexto.' },
  { id: 'BL-UI-013', area: 'CORE', label: 'Calendar', slug: 'calendar', description: 'Agenda de prazos derivada de tarefas.' },
  { id: 'BL-UI-014', area: 'CORE', label: 'Audit', slug: 'audit', description: 'Ledger local de mutações e evidências.' },
  { id: 'BL-UI-015', area: 'CORE', label: 'Settings', slug: 'settings', description: 'Preferências do Brainlink, export, import e reset.' },
  { id: 'BL-UI-016', area: 'SUPERADMIN', label: 'Overview', slug: 'superadmin/overview', description: 'Visão sistêmica da instalação.' },
  { id: 'BL-UI-017', area: 'SUPERADMIN', label: 'Changelog', slug: 'superadmin/changelog', description: 'Histórico cumulativo e mutações do produto.' },
  { id: 'BL-UI-018', area: 'SUPERADMIN', label: 'Roadmap', slug: 'superadmin/roadmap', description: 'Roadmap administrativo.' },
  { id: 'BL-UI-019', area: 'SUPERADMIN', label: 'Tasks', slug: 'superadmin/tasks', description: 'Fila administrativa de tarefas.' },
  { id: 'BL-UI-020', area: 'SUPERADMIN', label: 'Modules', slug: 'superadmin/modules', description: 'Módulos e estado de implementação.' },
  { id: 'BL-UI-021', area: 'SUPERADMIN', label: 'Workers', slug: 'superadmin/workers', description: 'Controle administrativo dos workers.' },
  { id: 'BL-UI-022', area: 'SUPERADMIN', label: 'Rules', slug: 'superadmin/rules', description: 'Administração das regras efetivas.' },
  { id: 'BL-UI-023', area: 'SUPERADMIN', label: 'Approvals', slug: 'superadmin/approvals', description: 'Aprovações humanas obrigatórias.' },
  { id: 'BL-UI-024', area: 'SUPERADMIN', label: 'Alerts, Bugs & Risks', slug: 'superadmin/alerts', description: 'Alertas, bugs e riscos concentrados.' },
  { id: 'BL-UI-025', area: 'SUPERADMIN', label: 'Evidence & Audit', slug: 'superadmin/evidence', description: 'Evidência e auditoria administrativa.' },
  { id: 'BL-UI-026', area: 'SUPERADMIN', label: 'Documents & Index', slug: 'superadmin/documents-index', description: 'Saúde da indexação e superfícies de documento.' },
  { id: 'BL-UI-027', area: 'SUPERADMIN', label: 'Connections', slug: 'superadmin/connections', description: 'Conexões instaladas e capacidade.' },
  { id: 'BL-UI-028', area: 'SUPERADMIN', label: 'Secrets', slug: 'superadmin/secrets', description: 'Broker de segredos por referência; valores nunca são renderizados.' },
  { id: 'BL-UI-029', area: 'SUPERADMIN', label: 'Data & Migrations', slug: 'superadmin/data-migrations', description: 'Estado do data plane e migrações.' },
  { id: 'BL-UI-030', area: 'SUPERADMIN', label: 'Backup / Export / Restore', slug: 'superadmin/backup', description: 'Backup e restauração verificável.' },
  { id: 'BL-UI-031', area: 'SUPERADMIN', label: 'Licenses & SBOM', slug: 'superadmin/licenses', description: 'Licenças, provenance e SBOM.' },
  { id: 'BL-UI-032', area: 'SUPERADMIN', label: 'Settings', slug: 'superadmin/settings', description: 'Configurações administrativas.' },
  { id: 'BL-UI-033', area: 'MOBILE', label: 'Mobile Home & Projects', slug: 'projects', description: 'Projetos em superfície mobile.' },
  { id: 'BL-UI-034', area: 'MOBILE', label: 'Realtime AI Chat', slug: 'chat', description: 'Superfície de chat realtime preparada para adapter.' },
  { id: 'BL-UI-035', area: 'MOBILE', label: 'Tasks', slug: 'tasks', description: 'Tarefas mobile.' },
  { id: 'BL-UI-036', area: 'MOBILE', label: 'Approvals', slug: 'approvals', description: 'Aprovações mobile.' },
  { id: 'BL-UI-037', area: 'MOBILE', label: 'Workers', slug: 'workers', description: 'Workers mobile.' },
  { id: 'BL-UI-038', area: 'MOBILE', label: 'Evidence', slug: 'evidence', description: 'Evidências mobile.' },
  { id: 'BL-UI-039', area: 'MOBILE', label: 'Notifications', slug: 'notifications', description: 'Notificações do Brainlink.' },
];

export const BRAINLINK_CONTEXTUAL_SCREENS = [
  'Global Search and Command Palette',
  'Document Inspector',
  'Project Detail',
  'Task Detail',
  'Worker Detail',
] as const;
