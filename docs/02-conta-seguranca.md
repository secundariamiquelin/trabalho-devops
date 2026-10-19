# 02 · Criar a conta com segurança e controle de gastos

## Objetivo

Deixar o acesso à conta protegido e o gasto monitorado antes de existir qualquer recurso. A conta é a raiz de tudo: quem entra nela pode criar máquinas, abrir portas e, se ela for convertida em paga, gerar cobrança.

## Cadastro

1. Acessar <https://www.oracle.com/cloud/free/> e clicar em **Start for free**.
2. Informar país, nome e e-mail, e confirmar o e-mail.
3. Definir a senha da conta. Usar senha longa e única, guardada num gerenciador de senhas, nunca reaproveitada de outro serviço.
4. Escolher a **região home** (justificativa abaixo). Essa escolha é definitiva.
5. Informar endereço e cartão. A Oracle faz uma autorização temporária de US$ 1, que é estornada, só para validar o cartão ([Oracle, *Changing the payment method*](https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/changingpaymentmethod.htm)). A conta fica no Free Tier e não vira paga sem um upgrade explícito.
6. Aguardar o e-mail de conta provisionada e entrar no console.

![Console da Oracle com a conta criada (dados pessoais ocultos)](img/cap02-conta-criada.png)

> **PENDENTE:** recorte da tela inicial do console após o primeiro login. Antes de salvar, cobrir nome, e-mail, nome da tenancy e OCIDs com uma tarja.

## Região escolhida e justificativa

**Região escolhida:** Brazil East (São Paulo), identificador `sa-saopaulo-1`.

| Critério | São Paulo (`sa-saopaulo-1`) | Vinhedo (`sa-vinhedo-1`) | Regiões dos EUA |
|---|---|---|---|
| Latência para usuários no Brasil | Baixa | Baixa | Mais alta (o tráfego cruza o continente) |
| Dados hospedados no Brasil | Sim | Sim | Não |
| Disponibilidade do Micro (E2.1) | Disponível | Disponível | Disponível |
| Capacidade do A1 (Arm) | Frequentemente esgotada, segundo relatos de usuários | Idem | Varia |

A região home não pode ser trocada porque é nela que a Oracle mantém a identidade da conta (usuários, grupos e políticas). Os recursos Always Free também ficam presos a ela ([Managing Regions](https://docs.oracle.com/en-us/iaas/Content/Identity/regions/managingregions.htm)). Escolher uma região distante dos usuários significaria conviver para sempre com mais latência. Como este trabalho usa o shape Micro (capítulo 04), a escassez de A1 em São Paulo não pesa na decisão.

Lista oficial de regiões: [Regions and Availability Domains](https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm).

> **PENDENTE:** se o cadastro tiver sido feito em outra região, trocar o texto acima pela região real e ajustar a justificativa.

## Medidas de segurança ativadas

| Medida | Como foi feito | Por quê |
|---|---|---|
| Senha forte e única | Gerada e guardada no gerenciador de senhas | Uma senha vazada de outro site não abre a conta |
| MFA (verificação em 2 etapas) | No primeiro login, o console pede o cadastro de um segundo fator. Registrar o app autenticador (Oracle Mobile Authenticator ou outro app TOTP) | Mesmo com a senha vazada, ninguém entra sem o celular |
| Códigos de recuperação (bypass codes) | Gerados no perfil do usuário e guardados fora do computador | Permitem entrar se o celular for perdido. A Oracle recomenda manter o bypass habilitado |
| E-mail de notificação | Conferir que os avisos de segurança e de cobrança vão para um e-mail lido de verdade | Os alertas de gasto (abaixo) só servem se alguém lê |
| Nenhuma chave de API criada para o usuário administrador | O pipeline usa só uma chave SSH própria, no servidor (capítulo 08) | Uma chave de API do administrador vazada daria controle total da conta |

Na OCI com Identity Domains, a política de sign-on *Security Policy for OCI Console* exige MFA de todo usuário local para acessar o console ([Oracle, *MFA with identity domains*](https://docs.oracle.com/en-us/iaas/Content/Security/Reference/iam_security_topic-iam_mfa_with_identity_domains.htm); [Sign-on policy](https://docs.oracle.com/en-us/iaas/Content/Security/Reference/iam_security_topic-iam_mfa_identity_domains_signon_policy.htm)).

**Caminho no console para conferir o MFA:** menu do perfil (canto superior direito), **My profile**, aba **Security** (ou **2-Step Verification**). Ali aparecem os fatores cadastrados.

![Perfil do usuário com o MFA ativo](img/cap02-mfa-ativo.png)

> **PENDENTE:** recorte da tela de perfil mostrando o fator de MFA cadastrado (ocultar e-mail e nome).

## Orçamento e alerta de gasto

Um budget na OCI é um limite **de aviso**, não de bloqueio: a documentação o chama de *soft limit*. Ele não desliga recursos, só dispara alertas. As regras são avaliadas a cada 24 horas e podem disparar por gasto real (*Actual Spend*) ou previsto (*Forecast Spend*), em percentual do orçamento ou em valor fixo ([Budgets overview](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm); [Creating a budget alert rule](https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/create-alert-rule.htm)).

Como a meta é **custo zero**, o orçamento é pequeno para que qualquer centavo gere aviso.

**Passos:** menu **Billing & Cost Management**, depois **Budgets**, depois **Create Budget**.

| Campo | Valor | Motivo |
|---|---|---|
| Name | `orcamento-zero` | |
| Target | Compartment raiz (root) da tenancy | Cobre todos os compartments, inclusive o do trabalho |
| Schedule | Mensal | Recomeça todo mês |
| Budget amount | US$ 1 | Valor mínimo prático. Se o custo esperado é zero, qualquer gasto é anomalia |
| Regra 1: Actual Spend, Percentage of Budget, 1% | Dispara com US$ 0,01 de gasto real | Detecta cobrança real no dia seguinte |
| Regra 2: Forecast Spend, Percentage of Budget, 100% | Dispara se a projeção do mês passar de US$ 1 | Avisa antes do fim do mês. Precisa de pelo menos 3 dias de consumo para calcular |
| Destinatário | E-mail pessoal lido diariamente | |

![Budget criado com as duas regras de alerta](img/cap02-budget-alerta.png)

> **PENDENTE:** recorte da tela do budget mostrando o valor de US$ 1 e as duas regras de alerta.

## Registro

- **Objetivo:** conta protegida e com gasto monitorado antes de criar recursos.
- **O que fiz:** cadastro com cartão de validação, região São Paulo, MFA ativo, códigos de recuperação guardados e budget de US$ 1 com dois alertas.

> **PENDENTE:** registrar o que deu errado no cadastro (por exemplo: cartão recusado, verificação de e-mail ou telefone, demora no provisionamento) e como foi resolvido. Se nada deu errado, dizer isso.

## Fontes

- Oracle. *Managing Regions.* <https://docs.oracle.com/en-us/iaas/Content/Identity/regions/managingregions.htm>
- Oracle. *Regions and Availability Domains.* <https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm>
- Oracle. *Budgets overview.* <https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm>
- Oracle. *Creating a budget alert rule.* <https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/create-alert-rule.htm>
- Oracle. *MFA* (IAM security). <https://docs.oracle.com/en-us/iaas/Content/Security/Reference/iam_security_topic-IAM_MFA.htm>
- **Uso de IA:** o Claude (Anthropic) redigiu o roteiro e a justificativa a partir da documentação oficial. Os passos no console foram executados por mim.
