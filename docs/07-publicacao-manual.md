# 07 · Publicar o app manualmente

## Objetivo

Publicar o 2048 no servidor fazendo à mão exatamente o que o pipeline fará depois. Assim cada passo automatizado no capítulo 08 tem um equivalente manual que pode ser executado e entendido.

> **NÃO EXECUTADO:** sem conta na Oracle não há servidor, então a publicação manual, o teste de reinício e o acesso externo não foram feitos e não existe endereço público. O que foi executado de verdade:
>
> - o build e o app rodando localmente (capítulo 06);
> - o script de ativação de versão, testado no GitHub Actions numa pasta temporária, cobrindo ativação, rollback, recusa de versão inexistente, recusa de `../../etc` e limpeza de versões antigas (capítulo 08).

## Estrutura no servidor

```text
/var/www/2048/
├── releases/
│   ├── bootstrap/          página "Servidor pronto" (capítulo 05)
│   └── <commit>/           uma pasta por versão publicada
├── current -> releases/<commit>   o que o nginx serve
└── previous_release        versão anterior, usada no rollback
```

Publicar uma versão é: (1) copiar os arquivos para uma pasta nova em `releases/` e (2) apontar `current` para ela. A troca do link é **atômica**: o script cria o link novo ao lado e o renomeia por cima do antigo (`mv -T`). Não existe um instante em que o site esteja pela metade ou sem página.

## Passo a passo manual (planejado)

### 1. No meu computador (PowerShell): testar, gerar o build e enviar

```powershell
npm.cmd test                         # nada é publicado se algum teste falhar
npm.cmd run build                    # dist/ com a versão = commit atual
$SHA = git rev-parse --short HEAD
Get-Content dist\version.txt         # deve ser igual a $SHA

$KEY = "$env:USERPROFILE\.ssh\oci_2048_admin"
$IP  = "<IP-PUBLICO>"
scp -i $KEY -r dist "ubuntu@${IP}:~/release-$SHA"
```

### 2. No servidor: colocar a versão no lugar e ativar

```bash
# Entrar pelo PowerShell: ssh -i $KEY "ubuntu@${IP}"   (comandos abaixo rodam no servidor)

SHA=<commit-mostrado-acima>
sudo install -d -o deploy -g deploy "/var/www/2048/releases/$SHA"
sudo cp -r ~/release-$SHA/. "/var/www/2048/releases/$SHA/"
sudo chown -R deploy:deploy "/var/www/2048/releases/$SHA"

# Mesmo script e mesmo usuário que o pipeline usa:
sudo -u deploy bash -s -- activate "$SHA" < ~/infra/activate-release.sh

rm -r ~/release-$SHA
curl -s http://127.0.0.1/version.txt     # deve mostrar o mesmo commit
```

O script [`infra/activate-release.sh`](../infra/activate-release.sh) recusa um identificador que não seja um hash hexadecimal (o que impede, por exemplo, `../../etc`) e recusa uma versão cujo `index.html` não chegou. Antes de trocar o `current`, ele guarda o alvo antigo em `previous_release`, o que permite o rollback, e depois apaga versões antigas, mantendo as 5 mais recentes.

### 3. Conferir no navegador

Abrir `http://<IP-PUBLICO>/` e conferir o rodapé **"Versão publicada: `<commit>`"**.

## Como o app sobrevive a um reinício do servidor

O app não depende de nenhum processo iniciado à mão nem de terminal aberto:

| Peça | Por que volta sozinha |
|---|---|
| nginx | Serviço do systemd habilitado (`systemctl enable nginx`, feito pelo script do capítulo 05). O systemd o inicia em todo boot e o reinicia se ele cair |
| Arquivos do app | Estão no disco (boot volume), não em memória |
| Link `current` | É um arquivo no disco, então persiste |
| Firewall do sistema | `netfilter-persistent` recarrega `/etc/iptables/rules.v4` no boot, já com a regra da porta 80 |
| Atualizações automáticas | `unattended-upgrades` habilitado no systemd |

Fechar o terminal SSH não afeta nada, porque nenhum desses processos pertence à sessão SSH.

**Teste de reinício (planejado):**

```bash
sudo reboot
```

```powershell
# Cerca de 1 minuto depois, do meu computador:
curl.exe -s "http://<IP-PUBLICO>/version.txt"
ssh -i $KEY "ubuntu@${IP}" "systemctl is-active nginx; uptime"
```

> **NÃO EXECUTADO:** evidência prevista: recorte do terminal com `uptime` (poucos minutos) e `curl` devolvendo o commit depois do `sudo reboot`.

## Endereço público e acesso de fora da minha rede

**Endereço:** não existe, porque o servidor não foi criado.

**Como seria comprovado:** abrir o endereço no celular **com o Wi-Fi desligado**, usando a rede móvel da operadora. Assim o acesso não passa pela rede de casa nem da faculdade.

> **NÃO EXECUTADO:** evidência prevista: captura de tela do celular com o app aberto pelo IP público e o indicador de rede móvel (4G/5G) visível na barra de status.

## Registro

- **Objetivo:** publicar à mão, entender cada passo e garantir que o app sobrevive a reinícios.
- **O que fiz:** escrevi o roteiro manual e o script de ativação, e rodei o build e o app localmente.
- **O que deu errado:** o teste do script de ativação não roda no Windows. O Git Bash não cria links simbólicos sem privilégio de administrador ("Operation not permitted").
- **Como corrigi:** o teste passou a rodar só no runner Linux do GitHub Actions, onde passou.
- **O que não fiz:** não publiquei em servidor, não fiz o teste de reinício e não fiz o acesso externo, porque não há conta na Oracle.

## Fontes

- systemd. *systemctl(1)* (`enable`, `is-active`). <https://www.freedesktop.org/software/systemd/man/latest/systemctl.html>
- GNU Coreutils. *mv invocation* (opção `-T`). <https://www.gnu.org/software/coreutils/manual/html_node/mv-invocation.html>
- Ubuntu. *netfilter-persistent(8).* <https://manpages.ubuntu.com/manpages/noble/man8/netfilter-persistent.8.html>
- **Uso de IA:** o Claude (Anthropic) escreveu o script de ativação e o roteiro. A publicação em servidor não foi executada.
