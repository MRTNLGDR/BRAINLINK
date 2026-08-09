import type { GovernanceSnapshot } from './governance-types';

const SNAPSHOT_URL = '/api/governance/snapshot';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function assertGovernanceSnapshot(value: unknown): asserts value is GovernanceSnapshot {
  if (!isRecord(value)) {
    throw new Error('Resposta de governanca invalida.');
  }

  const requiredArrays = ['modules', 'tasks', 'alerts', 'changelog', 'logs', 'documents'];
  if (
    value.schemaVersion !== '1.0' ||
    !['READY', 'DEGRADED', 'EMPTY'].includes(String(value.state)) ||
    typeof value.generatedAt !== 'string' ||
    !isRecord(value.summary) ||
    requiredArrays.some(key => !Array.isArray(value[key]))
  ) {
    throw new Error('Contrato do snapshot de governanca incompativel.');
  }
}

export async function fetchGovernanceSnapshot(signal?: AbortSignal): Promise<GovernanceSnapshot> {
  const response = await fetch(SNAPSHOT_URL, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      details
        ? `Governanca indisponivel (${response.status}): ${details.slice(0, 180)}`
        : `Governanca indisponivel (${response.status}).`
    );
  }

  const payload: unknown = await response.json();
  assertGovernanceSnapshot(payload);
  return payload;
}

export function connectGovernanceEvents(onUpdate: () => void, onState: (online: boolean) => void) {
  const source = new EventSource('/api/governance/events');
  source.addEventListener('open', () => onState(true));
  source.addEventListener('snapshot', onUpdate);
  source.addEventListener('error', () => onState(false));
  return () => source.close();
}
