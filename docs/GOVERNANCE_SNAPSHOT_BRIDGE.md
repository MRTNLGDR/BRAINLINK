# Governance Snapshot Bridge

## Objetivo

O Governance Snapshot Bridge transforma a governanca do Brainlink em estado operacional observavel. A interface nao calcula nem inventa registros: ela consulta a fonte persistente pelo endpoint `GET /api/governance/snapshot` e apresenta exatamente o contrato validado pelo backend.

## Fonte unica e contrato

- Fonte canonica: `governance/governance-snapshot.json`.
- Contrato compartilhado: `brainlink-runtime/governance/governance-types.ts`.
- Leitura e validacao: `scripts/brainlink-governance-store.mjs`.
- Endpoint de producao: `scripts/brainlink-serve.mjs`.
- Endpoint de desenvolvimento: middleware materializado em `tools/cli/src/brainlink-governance-dev.ts`.
- O resumo, o percentual e o estado geral sao recalculados no servidor em cada leitura.
- Arquivo ausente, JSON invalido ou contrato incompativel retorna `503`; nao existe fallback estatico.

## Sincronizacao da interface

O painel usa React Query com `staleTime: 0`, polling de 15 segundos e nova consulta quando a janela recupera foco. O evento global `oraculo:governance-updated` invalida a consulta imediatamente. O canal SSE `/api/governance/events` avisa alteracoes no arquivo; se o SSE cair, o polling continua ativo. O botao **Atualizar agora** permite refetch manual.

## Estados de interface

- `loading`: skeletons sem indicadores inventados.
- `error`: mensagem da bridge e acao de nova tentativa.
- `EMPTY`: fonte valida sem modulos e tarefas.
- `READY`: operacao sem tarefa bloqueada ou alerta critico aberto.
- `DEGRADED`: tarefa bloqueada ou alerta critico aberto.

## Atualizacoes e seguranca

`POST /api/governance/events` aceita apenas conexoes loopback e so e habilitado quando `BRAINLINK_GOVERNANCE_TOKEN` esta definido. O token deve ser enviado em `X-Brainlink-Governance-Token`. Os eventos permitidos sao `TASK_STATUS`, `ALERT_STATUS` e `LOG`; todos sao validados antes de uma gravacao atomica. O corpo e limitado a 64 KiB. A API de leitura usa `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`.

Exemplo local:

```powershell
$env:BRAINLINK_GOVERNANCE_TOKEN = '<segredo-local>'
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8080/api/governance/events' -Headers @{ 'X-Brainlink-Governance-Token' = $env:BRAINLINK_GOVERNANCE_TOKEN } -ContentType 'application/json' -Body '{"kind":"TASK_STATUS","id":"BL-TASK-008","status":"DONE"}'
```

## Backup, restauracao e exportacao

Criar backup validado:

```powershell
node scripts/brainlink-governance-backup.mjs backup
```

Restaurar um backup validado:

```powershell
node scripts/brainlink-governance-backup.mjs restore .brainlink-backups/governance/governance-AAAA-MM-DD.json
```

Antes de restaurar, o utilitario cria automaticamente um backup do estado corrente. A restauracao valida todo o contrato e usa troca atomica de arquivo. Para exportar, salve a resposta de `GET /api/governance/snapshot`; ela ja inclui resumo e estado recalculados.

## Recuperacao de falhas

1. Confirme que `governance/governance-snapshot.json` existe e e JSON valido.
2. Execute `node --test scripts/brainlink-governance-test.mjs`.
3. Reaplique o materializador para regenerar o ponteiro e o middleware do workspace.
4. Reinicie o servidor de desenvolvimento, pois a configuracao do middleware e carregada no bootstrap.
5. Se a fonte estiver corrompida, restaure o backup mais recente pelo utilitario documentado acima.

## Dependencias open source

O painel reutiliza `@tanstack/react-query` 5.90.16, ja presente no ambiente AFFiNE, e o sistema visual do proprio AFFiNE. A dependencia e declarada no workspace web durante a materializacao. Nenhum motor externo como Ollama ou LM Studio e introduzido por esta bridge.

## Limitacoes conhecidas

- O armazenamento canonico e um arquivo local e pressupoe um unico escritor por instalacao.
- SSE usa notificacao do sistema de arquivos; em volumes de rede com notificacoes limitadas, o polling de 15 segundos continua sendo a garantia de convergencia.
- Mutacoes remotas permanecem desabilitadas por desenho; a rota de escrita e loopback-only e exige token.
