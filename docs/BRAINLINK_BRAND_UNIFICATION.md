# Identidade unificada Brainlink

## Regra de produto

Brainlink e o unico nome de produto apresentado ao usuario. O editor, os documentos, o canvas, a inteligencia, a governanca, os projetos e as configuracoes pertencem a uma unica experiencia Brainlink.

## Implementacao

- O bootstrap web carrega `brainlink-brand.ts` antes da inicializacao da interface.
- Titulos de pagina, textos, atributos acessiveis e conteudo carregado dinamicamente sao normalizados para Brainlink.
- O observador cobre modais, rotas carregadas sob demanda, traducoes e atualizacoes React posteriores ao bootstrap.
- O favicon e imagens identificadas como icone do aplicativo recebem o monograma Brainlink.
- Links publicos de download e apresentacao apontam para o repositorio e releases Brainlink.
- Os modulos Brainlink materializados removem referencias visiveis ao nome legado.
- O Brainlink e registrado como rota nativa do workspace em `/workspace/:workspaceId/brainlink/*`.
- A barra lateral principal oferece uma unica entrada Brainlink usando a navegacao do workbench.
- Os modulos internos sao organizados em Operacao, Conhecimento, Governanca e Sistema dentro do painel ativo.
- O shell Brainlink independente, sua sidebar e sua topbar duplicadas nao sao renderizados.

## Limite tecnico e legal

Nomes internos de pacotes, caminhos de importacao, locks, hashes, repositorios de origem e arquivos de licenca permanecem intactos quando necessarios para compatibilidade, reproducibilidade e atribuicao open source. Esses identificadores nao definem uma segunda identidade de produto e nao sao apresentados como marca principal na interface.

## Gate

O teste de marca exige bootstrap global, observacao de mutacoes, substituicao de atributos, titulo Brainlink e materializacao posterior aos demais transforms. O gate de shell exige rota do workbench, entrada nativa na barra lateral, painel real do Brainlink e ausencia da sidebar duplicada. O preview deve apresentar contagem zero para o nome legado no texto visivel, nos atributos auditados e no titulo da pagina.
