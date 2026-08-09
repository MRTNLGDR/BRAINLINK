# Rastreabilidade de governanca

| Requisito | Implementacao | Evidencia automatizada |
| --- | --- | --- |
| Fonte unica persistente | `governance/governance-snapshot.json` | leitura real no teste do store |
| Contrato compartilhado | `brainlink-runtime/governance/governance-types.ts` | validacao de schema e enums |
| `GET /api/governance/snapshot` | bridge do servidor e middleware dev | teste HTTP de status, cache e resumo |
| Sem fallback estatico | erro `503` para fonte ausente ou invalida | teste de arquivo ausente e payload invalido |
| Polling entre 10 e 30 segundos | React Query a cada 15 segundos | assercao estatica do frontend |
| `staleTime: 0` e refetch por foco | configuracao da query | assercao estatica do frontend |
| Evento global de atualizacao | `oraculo:governance-updated` | assercao estatica do frontend |
| Atualizacao em tempo real | SSE em `/api/governance/events` | bridge e cliente EventSource |
| Loading, erro e vazio | estados explicitos do painel | assercao estatica e inspecao do preview |
| Resumo, modulos, tarefas, alertas, changelog, logs e documentos | abas do painel | inspecao do preview |
| Escrita controlada | loopback, token, validacao e gravacao atomica | teste de negacao e mutacao autorizada |
| Backup e restore | `brainlink-governance-backup.mjs` | validacao reutilizada antes da operacao |
| Materializacao repetivel | `apply-affine-governance-bridge.mjs` | validador do instalador |

## IDs permanentes

Modulos, tarefas, alertas, mudancas, logs e documentos usam prefixos `BL-MOD`, `BL-TASK`, `BL-ALERT`, `BL-CHANGE`, `BL-LOG` e `BL-DOC`. IDs nao devem ser reciclados. Um registro encerrado permanece no historico ou muda para estado arquivado/resolvido.

## Gate desta sessao

- Backend e fonte real implementados.
- Frontend integrado a rota de governanca existente.
- Sincronizacao multipla implementada.
- Escrita protegida e atomica.
- Testes do dominio e endpoint adicionados.
- Runbook, rastreabilidade, changelog, logs, tarefas e alertas atualizados.
