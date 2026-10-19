# 09 · Validar e refletir

## Objetivo

Fechar o ciclo: comprovar que os três objetivos funcionam, conferir que não ficou nenhum custo nem recurso esquecido e registrar limitações, riscos e aprendizados.

## Revalidação como outra pessoa

Refiz o caminho seguindo só esta documentação, na ordem dos capítulos, e anotei onde precisei de algo que não estava escrito.

> **PENDENTE:** depois de refazer o roteiro, listar aqui os pontos em que a documentação estava incompleta e o que foi corrigido em cada capítulo. Se der, peça a um colega que siga o capítulo 07 e anote as dúvidas dele.

## Checklist dos três objetivos

| # | Objetivo | Como verificar | Situação |
|---|---|---|---|
| 1 | **Oracle Cloud Free Tier:** conta protegida, com alerta de gasto e só recursos Always Free | Console: MFA ativo, budget de US$ 1 com 2 regras, instância E2.1.Micro com rótulo *Always Free-eligible*, custo do mês US$ 0,00 em **Billing & Cost Management > Cost Analysis** | _a preencher_ |
| 2 | **Servidor mínimo:** só o necessário, firewall em duas camadas, SSH só por chave, app sobrevive a reboot | `iptables -L`, `sshd -T`, security list, teste de reboot (capítulo 07) | _a preencher_ |
| 3 | **Pipeline com GitHub:** push na `main` publica sem entrar no servidor, e falha não publica | Aba Actions (sucesso e falha), rodapé de versão antes e depois | _a preencher_ |

![Objetivo 1: Cost Analysis do mês mostrando custo zero](img/cap09-custo-zero.png)

> **PENDENTE:** recorte de **Cost Analysis** (ou da página de uso do Free Tier) mostrando US$ 0,00 no mês.

![Objetivo 2: app respondendo pelo IP público depois do reboot](img/cap09-servidor-ok.png)

> **PENDENTE:** recorte do navegador no IP público com o app e o rodapé de versão (pode ser o mesmo do capítulo 07).

![Objetivo 3: lista de execuções na aba Actions](img/cap09-pipeline-ok.png)

> **PENDENTE:** recorte da lista de execuções do workflow mostrando as verdes e a falha tratada.

## Verificação de custo e recursos esquecidos

| Verificação | Onde | Esperado |
|---|---|---|
| Recursos criados no compartment | **Governance > Tenancy Explorer**, compartment `trabalho-devops` | Só: VCN, subnet, IGW, route table, security list, instância, boot volume, VNIC |
| Boot volumes órfãos | **Storage > Boot Volumes** | Nenhum volume sem instância (sobra quando uma instância é encerrada sem apagar o volume) |
| Volumes extras ou backups | **Storage > Block Volumes / Backups** | Nenhum |
| IPs reservados | **Networking > Reserved Public IPs** | Nenhum (uso o IP efêmero) |
| Load balancers | **Networking > Load Balancers** | Nenhum |
| Instâncias de teste em outras regiões | Seletor de região | Nenhuma |
| Status da conta | **Billing > Upgrade and Manage Payment** | Free Tier, sem upgrade |
| Budget | **Billing > Budgets** | US$ 1, nenhum alerta disparado |

> **PENDENTE:** marcar cada linha depois de conferir no console.

## Limitações do ambiente gratuito

- **Desempenho:** o E2.1.Micro tem 1/8 de OCPU (com uso adicional quando há CPU ociosa no host) e 1 GB de RAM. Serve um site estático com folga, mas não aguentaria um app com banco ou build no servidor.
- **Banda:** 50 Mbps para a internet no Micro. Muitos acessos simultâneos a arquivos grandes ficariam lentos.
- **Recuperação por ociosidade:** um site pouco visitado pode ser considerado ocioso (CPU no percentil 95 e rede abaixo de 20% por 7 dias) e a instância pode ser recuperada pela Oracle. Para um site estático com pouco tráfego, isso é um risco real. A doc não garante aviso prévio no e-mail, então convém conferir o console de vez em quando.
- **Capacidade:** shapes gratuitos, principalmente o A1, podem estar esgotados ("Out of host capacity"). Recriar a instância pode não ser possível na hora.
- **Região fixa:** tudo fica preso à região home escolhida no cadastro.
- **Sem HTTPS:** sem domínio próprio, o app é servido por HTTP. O navegador mostra "Não seguro" e o conteúdo trafega sem criptografia (é um jogo, sem dados pessoais).
- **IP efêmero:** o IP público pode mudar se a instância for parada e iniciada pela Oracle ou recriada. Nesse caso, `APP_URL`, `SSH_HOST` e `SSH_KNOWN_HOSTS` precisam ser atualizados.
- **Ponto único de falha:** uma VM, sem balanceador e sem réplica. Se ela cair, o site cai.

## Riscos de segurança que restam e melhorias possíveis

| Risco | Por que existe | Melhoria possível |
|---|---|---|
| Porta 22 aberta para a internet inteira | Os runners do GitHub não têm IP fixo | (a) runner self-hosted dentro da VCN; (b) o workflow libera o IP do runner na security list pela API da OCI só durante o deploy; (c) acesso pelo OCI Bastion; (d) VPN como Tailscale ou WireGuard |
| Tentativas de login por força bruta nos logs | Consequência da porta 22 aberta | Senha já está desativada. Dá para acrescentar `fail2ban` ou limite de taxa no iptables |
| Chave do pipeline sem frase-senha | O pipeline não tem como digitá-la | Já mitigado: usuário sem sudo, `restrict` e escopo só em `/var/www/2048`. Melhoria: forçar um comando fixo no `authorized_keys` (`command=`) que só aceite rsync para `releases/` |
| HTTP sem TLS | Sem domínio | Usar um nome via `sslip.io` ou um domínio próprio com Let's Encrypt (`certbot --nginx`) e abrir a 443 |
| Ações de terceiros no workflow (`actions/checkout`, etc.) | O workflow confia no código delas | Fixar as ações por hash de commit em vez de tag e ativar o Dependabot para elas |
| Sem monitoramento externo | Se o site cair, ninguém é avisado | Monitor gratuito de uptime ou um alarme do OCI Monitoring com Notifications (Always Free) |
| Sem cópia de segurança da configuração do servidor | O servidor é reconstruível pelos scripts | Já mitigado: `server-setup.sh` + pipeline recriam tudo. Melhoria: provisionar a rede e a instância com Terraform (OCI Resource Manager é Always Free) |

## Aprendizados pessoais

> **PENDENTE:** escrever em primeira pessoa, em um ou dois parágrafos curtos, o que aprendi. Sugestões de pontos: o que achava de "deploy" antes e depois; o que mais surpreendeu (por exemplo, o firewall do sistema bloqueando mesmo com a security list aberta, ou a diferença entre os limites dos tutoriais e os da documentação oficial); o que eu faria diferente (por exemplo, começar pelo budget, escolher A1 ou Micro, automatizar a rede com Terraform). Este texto precisa ser meu, não da IA.

## O que faria diferente

- Provisionaria a rede e a instância com Terraform desde o início, para que o capítulo 03 também fosse reproduzível por comando.
- Resolveria o HTTPS logo no começo, com um nome `sslip.io`.
- Restringiria a porta 22 com runner self-hosted ou liberação dinâmica do IP do runner.

> **PENDENTE:** completar ou ajustar esta lista com a minha experiência real.

## Declaração de uso de IA

Este trabalho usou o **Claude (Anthropic)**, pelo Claude Code, como assistente para:

- pesquisar e resumir a documentação oficial (capítulos 01 a 05 e 08);
- escolher o app e escrever o build, os testes, os scripts de servidor e o workflow;
- escrever os rascunhos dos capítulos e o script que gera este PDF.

Conferi os números da Oracle na página oficial. A execução na conta Oracle, no servidor e no GitHub (cadastro, MFA, budget, rede, instância, publicação, segredos e pushes de prova) e as capturas de tela correspondentes foram feitas por mim. As explicações foram revisadas por mim.

> **PENDENTE:** ajustar esta declaração ao que de fato foi feito com e sem IA.

## Fontes

- Oracle. *Always Free Resources* (instâncias ociosas e capacidade). <https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>
- Oracle. *Tenancy Explorer.* <https://docs.oracle.com/en-us/iaas/Content/General/Concepts/compartmentexplorer.htm>
- GitHub. *Security hardening for GitHub Actions* (fixar ações por hash). <https://docs.github.com/en/actions/reference/security/secure-use>
- Let's Encrypt. *Getting started.* <https://letsencrypt.org/getting-started/>
