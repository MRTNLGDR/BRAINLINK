# Brainlink Operating System

## Identidade

Brainlink e o produto completo. O motor de documentos, canvas, CRDT, workspace, pesquisa e sincronizacao faz parte do Brainlink e nao constitui um segundo software. Nomes internos de dependencias permanecem apenas para compatibilidade open source.

## Objetivo

Brainlink organiza informacao e execucao em um unico grafo operacional. Vida, ideias, projetos, empresa, pessoas, orcamento, tarefas, documentos e Brains compartilham ownership, fonte documental, estado, recursos, evidencia e historico.

## Dominios

| Dominio | Funcao |
|---|---|
| Organization | Visao de tudo, indicadores, documentacao e Brains |
| Life | Objetivos, areas pessoais, rotinas e responsabilidades |
| Ideas | Captura, maturacao, ownership e transformacao em trabalho |
| Projects | Resultados, progresso, saude, tarefas e evidencia |
| Company | Operacao, processos, pessoas, Brains e recursos |
| Budget | Planejado, realizado e saldo por item organizacional |
| People | Pessoas, papeis, relacoes e responsabilidades |
| Brains | Workers de IA, tarefa, atividade, heartbeat e conformidade |

## Documentacao como fonte de verdade

- Cada item organizacional pode apontar para um documento real do workspace Brainlink.
- O seletor consulta a colecao real do workspace, sem dados demonstrativos.
- Abrir documento usa o workbench nativo e preserva o mesmo shell.
- Ausencia de documento aparece como `DOC GAP`.
- Brain indexa o conteudo real dos documentos em worker local e recupera evidencias antes de responder.

## Brain

Brain e a inteligencia local do Brainlink. O motor interno e o provider padrao. OpenRouter permanece opcional, explicito e limitado ao contexto autorizado. Brain ajuda a ler, estruturar, melhorar, resumir e auditar a documentacao.

## Brains e Workers

Worker e a entidade executora de IA. Na interface, a identidade operacional e Brain. Cada Brain mostra papel, estado, tarefa, projeto, atividade registrada, heartbeat, documentos, regras reconhecidas, evidencias e percentual de conformidade.

Start, Pause, Checkpoint e Acknowledge docs geram mutacoes reais no estado local, auditoria, recibos, heartbeat e evidencia. Nenhum estado de atividade e inferido apenas por aparencia.

## Persistencia

- Estado executivo: `brainlink:state:v2`.
- Estado organizacional: `brainlink:organizer:v1`.
- Mensagens do Brain: chave local por workspace.
- Documentos: colecao local-first do workspace e CRDT existente.

## Gates

O materializador deve instalar catalogo, componente organizacional, rotas, Brain, workbench e testes. A entrega e bloqueada se os dominios nao existirem, se documentos forem simulados, se Workers nao mostrarem atividade/conformidade ou se a interface voltar a apresentar uma segunda identidade de produto.
