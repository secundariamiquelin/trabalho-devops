# Trabalho DevOps: 2048 na Oracle Cloud com deploy automático

O jogo [2048](https://github.com/gabrielecirulli/2048) (licença MIT), com infraestrutura planejada para uma VM Always Free da Oracle Cloud e pipeline do GitHub Actions. A parte de CI roda a cada push na `main`; a infraestrutura e o deploy não foram executados.

- **App no ar:** não publicado. A conta na Oracle Cloud não foi criada, então a infraestrutura e o deploy ficaram só no planejamento. O CI roda normalmente.
- **Documentação:** nove capítulos em [`docs/`](docs/), exportados para `trabalho-devops.pdf`

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `app/` | Código do 2048 (cópia com a licença MIT original e duas alterações descritas no capítulo 06) |
| `tests/` | Testes das regras do jogo, do site e do build (`node:test`), mais o teste do script de release (bash) |
| `scripts/build.mjs` | Gera `dist/` com o commit no rodapé e em `version.txt` |
| `scripts/serve.mjs` | Servidor local de `dist/` para conferência |
| `scripts/build-pdf.mjs` | Junta `docs/*.md` em `trabalho-devops.pdf` |
| `scripts/capture.mjs` | Captura de telas de páginas públicas usadas como evidência |
| `infra/server-setup.sh` | Preparação idempotente da VM Ubuntu 24.04 |
| `infra/nginx/2048.conf` | Site do nginx |
| `infra/activate-release.sh` | Troca atômica da versão publicada e rollback |
| `.github/workflows/ci-cd.yml` | Pipeline: testes, build, deploy por SSH e health check com rollback |
| `docs/` | Capítulos 01 a 09 (Markdown) e imagens |

## Comandos

No PowerShell do Windows use `npm.cmd`, que funciona mesmo com a execução de scripts bloqueada.

```powershell
npm.cmd test          # testes (não precisam de npm install)
npm.cmd run build     # gera dist/
npm.cmd run serve     # http://127.0.0.1:8080
npm.cmd install       # só para gerar o PDF (marked, mermaid, puppeteer-core)
npm.cmd run pending   # lista as evidências que ainda faltam
npm.cmd run pdf       # gera trabalho-devops.pdf (usa o Edge ou o Chrome instalado)
```

## Deploy

Planejado (não executado, sem servidor): push na `main`, testes verdes, `rsync` para `/var/www/2048/releases/<commit>/`, troca do link `current` e conferência de `/version.txt`. Se a versão no ar não bater com o commit, o pipeline faz rollback. Detalhes no [capítulo 08](docs/08-ci-cd.md).

Configuração necessária no repositório:

- **Secrets:** `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`, `SSH_HOST`
- **Variables:** `DEPLOY_ENABLED=true`, `APP_URL`

Sem `DEPLOY_ENABLED`, o pipeline só testa.

## Licença

O código do 2048 em `app/` é © 2014 Gabriele Cirulli, sob a licença MIT ([`app/LICENSE.txt`](app/LICENSE.txt)). Os scripts e a documentação deste repositório também são distribuídos sob a licença MIT.
