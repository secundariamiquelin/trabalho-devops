# Da pesquisa à entrega automática: do repositório ao ar

**Trabalho prático de DevOps:** Oracle Cloud Free Tier, servidor mínimo e pipeline com GitHub Actions.

**App publicado:** 2048, de Gabriele Cirulli (licença MIT).

| Item | Valor |
|---|---|
| Autor(a) | _a preencher_ |
| Disciplina / turma | _a preencher_ |
| Repositório | <https://github.com/secundariamiquelin/trabalho-devops> |
| Endereço público do app | _a preencher (http://IP-público/)_ |
| Data de entrega | _a preencher_ |

> **PENDENTE:** preencher a tabela acima com nome, turma e endereço público antes de gerar o PDF final.

**Como este documento foi produzido:** os capítulos foram escritos em Markdown, na pasta `docs/` do repositório. O script `scripts/build-pdf.mjs` junta todos num único PDF (`npm run pdf`). Ele converte o Markdown com a biblioteca `marked`, desenha os diagramas Mermaid num navegador sem interface (Edge ou Chrome, controlado pelo `puppeteer-core`) e imprime em A4. Títulos, blocos de código e imagens saem iguais aos do Markdown.

**Convenção:** blocos em vermelho marcados como **PENDENTE** são evidências que só existem depois de executar o passo na conta Oracle ou no servidor. O comando `npm run pending` lista todos os que ainda faltam.
