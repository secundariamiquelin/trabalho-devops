# Da pesquisa à entrega automática: do repositório ao ar

**Trabalho prático de DevOps:** Oracle Cloud Free Tier, servidor mínimo e pipeline com GitHub Actions.

**App publicado:** 2048, de Gabriele Cirulli (licença MIT).

| Item | Valor |
|---|---|
| Autor | Gabriel Ferreira Miquelin |
| RA | 207912-25 |
| Turma | ADS2 |
| Repositório | <https://github.com/secundariamiquelin/trabalho-devops> |
| Endereço público do app | Não publicado: a conta na Oracle Cloud não foi criada (capítulos 02 e 09) |

**Como este documento foi produzido:** os capítulos foram escritos em Markdown, na pasta `docs/` do repositório. O script `scripts/build-pdf.mjs` junta todos num único PDF (`npm run pdf`). Ele converte o Markdown com a biblioteca `marked`, desenha os diagramas Mermaid num navegador sem interface (Edge ou Chrome, controlado pelo `puppeteer-core`) e imprime em A4. Títulos, blocos de código e imagens saem iguais aos do Markdown.

**Situação do trabalho:** decidi não criar a conta na Oracle Cloud. Por isso as etapas que dependem dela (conta, rede, instância, servidor, publicação e deploy automático) estão **planejadas, mas não executadas**. Foram executados de verdade: a pesquisa (capítulo 01), a escolha e o teste local do app (capítulo 06), o repositório e a parte de CI do pipeline no GitHub Actions (capítulo 08).

**Convenção:** blocos em laranja marcados como **NÃO EXECUTADO** indicam a etapa ou a evidência que ficou só no planejamento. Blocos em vermelho marcados como **PENDENTE** indicam algo que ainda falta preencher.
