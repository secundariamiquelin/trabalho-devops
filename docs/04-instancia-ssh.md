# 04 · Criar a instância e acessar por SSH

## Objetivo

Criar a máquina virtual dentro dos limites Always Free e acessá-la só por chave SSH, nunca por senha.

## Configuração escolhida

| Item | Escolha | Justificativa |
|---|---|---|
| Nome | `vm-2048` | |
| Compartment | `trabalho-devops` | Tudo do trabalho no mesmo lugar (capítulo 03) |
| Imagem (sistema) | Canonical Ubuntu 24.04 (LTS) | Suporte de segurança até 2029. É a imagem com mais documentação e é a que os scripts do repositório supõem. Prefiro a imagem padrão à variante *Minimal*, porque o comportamento de firewall da padrão está documentado pela Oracle (capítulo 05) |
| Shape | `VM.Standard.E2.1.Micro` (AMD, 1/8 OCPU, 1 GB de RAM) | Always Free sem consumir horas do A1. O app é um site estático servido pelo nginx, que usa poucas dezenas de MB de RAM, então 1 GB sobra. É x86, sem surpresa de compatibilidade |
| Plano B de shape | `VM.Standard.A1.Flex` com 1 OCPU e 6 GB | Se o Micro estiver indisponível. Fica dentro dos 2 OCPUs e 12 GB gratuitos |
| Boot volume | Tamanho padrão, sem volume extra | Fica bem abaixo dos 200 GB Always Free (capítulo 01) |
| Rede | `vcn-2048` / `subnet-publica`, com **Assign a public IPv4 address** marcado | Precisa ser alcançável pela internet (capítulo 03) |
| Chave SSH | Upload da chave pública `oci_2048_admin.pub` | O acesso é por chave. A imagem Ubuntu da OCI já vem sem login por senha |

## Chave pública e chave privada

Um par de chaves SSH são dois arquivos ligados matematicamente:

- **Chave privada** (`oci_2048_admin`): é a que prova quem sou. Fica **só no meu computador**, em `C:\Users\<eu>\.ssh\`, protegida por uma frase-senha e com permissão de leitura só para o meu usuário. Nunca é enviada a ninguém: nem à Oracle, nem ao GitHub, nem por chat.
- **Chave pública** (`oci_2048_admin.pub`): pode ser mostrada a qualquer um. Vai para o servidor, no arquivo `~/.ssh/authorized_keys` do usuário `ubuntu`. A Oracle a coloca lá na criação da instância.

Na conexão, o servidor manda um desafio que só quem tem a chave privada consegue assinar, e confere a assinatura com a chave pública. A chave privada nunca trafega pela rede. Por isso uma chave é muito mais segura que uma senha: não há nada que possa ser adivinhado ou interceptado.

O pipeline do capítulo 08 usa **outro par de chaves**, exclusivo dele. Se esse par vazar, basta removê-lo do servidor sem afetar o meu acesso.

### Gerar o par (PowerShell, no Windows)

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\oci_2048_admin" -C "admin-vm-2048"
# Pede uma frase-senha: usar uma, ela protege a chave se o arquivo vazar.
Get-Content "$env:USERPROFILE\.ssh\oci_2048_admin.pub"   # isto é o que vai para o console
```

`ed25519` é o algoritmo recomendado hoje: chaves curtas, rápidas e seguras.

## Criação da instância

**Compute**, **Instances**, **Create instance**, com os valores da tabela acima. Em **Add SSH keys**, escolher **Paste public keys** e colar o conteúdo de `oci_2048_admin.pub`.

Se aparecer **"Out of host capacity"**, a mensagem quer dizer que faltam máquinas gratuitas daquele shape na região naquele momento. A Oracle orienta tentar outro availability domain ou esperar ([Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)). **Não** fazer upgrade da conta para contornar isso (capítulo 01).

![Instância vm-2048 em execução no console](img/cap04-instancia-running.png)

> **PENDENTE:** recorte da página da instância com estado **Running**, shape E2.1.Micro, imagem Ubuntu 24.04 e IP público. Ocultar OCIDs se aparecerem por inteiro.

## Primeiro acesso por SSH

```powershell
ssh -i "$env:USERPROFILE\.ssh\oci_2048_admin" ubuntu@<IP-PUBLICO>
```

Na primeira conexão o cliente mostra a impressão digital (*fingerprint*) da chave do servidor e pergunta se deve confiar nela. A resposta fica gravada em `known_hosts`. A partir daí, se a chave do servidor mudar, o cliente recusa a conexão, o que protege contra alguém se passando pelo servidor.

Comandos para comprovar o acesso:

```bash
hostnamectl          # sistema e kernel
whoami               # ubuntu
free -h              # cerca de 1 GB de RAM
df -h /              # tamanho do boot volume
```

![Terminal com a sessão SSH aberta na vm-2048](img/cap04-ssh-ok.png)

> **PENDENTE:** recorte do terminal com a sessão SSH e a saída de `hostnamectl` e `free -h`. Ocultar o IP público se preferir.

## Problemas encontrados e soluções

| Problema | Causa | Solução |
|---|---|---|
| (exemplo previsto) `Out of host capacity` ao criar | Falta de capacidade gratuita na região | Tentar de novo mais tarde ou em outro availability domain, ou usar o plano B de shape |
| (exemplo previsto) `WARNING: UNPROTECTED PRIVATE KEY FILE!` no Windows | A chave privada pode ser lida por outros usuários do Windows | Restringir a permissão: `icacls "$env:USERPROFILE\.ssh\oci_2048_admin" /inheritance:r /grant:r "$($env:USERNAME):R"` |
| (exemplo previsto) `Connection timed out` | Falta a regra de entrada TCP 22, falta a rota para o Internet Gateway ou a instância está sem IP público | Revisar o capítulo 03 |

> **PENDENTE:** trocar os exemplos previstos acima pelos problemas que de fato aconteceram, ou dizer que nenhum aconteceu.

## Fontes

- Oracle. *Always Free Resources* (shapes e "out of host capacity"). <https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>
- Oracle. *Compute: known issues and best practices.* <https://docs.oracle.com/en-us/iaas/Content/Compute/References/bestpracticescompute.htm>
- OpenSSH. Manual do `ssh-keygen(1)`. <https://man.openbsd.org/ssh-keygen>
- **Uso de IA:** o Claude (Anthropic) redigiu a explicação e os comandos. A criação e o acesso foram feitos por mim.
