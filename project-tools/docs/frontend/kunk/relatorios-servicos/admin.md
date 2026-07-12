# Relatórios de serviços — Admin

## Áreas

| App | Rota | Conteúdo |
|---|---|---|
| `apps/admin` | `/configs/services` **ou** `/servicos/tipos` | Catálogo de tipos + taxas + preço padrão |
| `apps/admin` | `/usuarios` | Criar operador com role `Profissional` + `internal_code` |
| `apps/admin` | `/usuarios/paginas` | Role `Profissional` → só `relatorios-servicos` |
| `apps/kunk` | `/app/profissionais` | Ação “Criar acesso” / convite vinculado ao `professional_code` |

Papel admin: apenas `Administrador`.

Atualizar nav do admin e [`../../admin/flow.md`](../../admin/flow.md).

---

## 1. Tipos de profissional, taxas e doação

### Por que no admin

No legado, taxas (−20 médico / −10 terapeuta) e defaults de preço estavam **hardcoded**.  
No OSS: **fee = 0**, preço padrão = null, **doação não desconta** por default.  
Cada associação configura a própria política.

### UI sugerida

```
Relatório de serviços — configurações
  [ ] Descontar doação do valor a pagar ao profissional
      (default: desligado — doação não reduz o pagamento)

Tipos de profissional
  [+ Novo tipo]

  Código | Label | Taxa associação (R$) | Preço padrão consulta | Ativo | Ações
```

### Dialog criar / editar tipo

| Campo | Validação |
|---|---|
| Código (`id`) | Obrigatório; slug estável; imutável após criar |
| Label | Obrigatório |
| Taxa da associação | Number ≥ 0; default **0** — **sempre** aplicada no relatório |
| Preço padrão da consulta | Number ≥ 0 ou vazio |
| Ativo | Checkbox |

Ajuda:

> **Taxa:** retida por consulta (`price − taxa`). Default 0 = paga o valor integral (antes da regra de doação).
>
> **Doação:** o switch global acima decide se `donation` também reduz o valor a receber.
>
> **Preço padrão:** se preenchido, no create do serviço **ignora** `consultation_price` do profissional.

### Persistência

| system | key | value |
|---|---|---|
| `services` | `professional_types` | JSON array |
| `services` | `report_settings` | `{ "deduct_donation_from_payable": false }` |

Seed: tipos canônicos fee=0 / price=null; `deduct_donation_from_payable: false`.

### Impacto em outras telas

| Tela | Mudança |
|---|---|
| `/app/profissionais` | Select `type` + **Criar conta / convite** |
| Novo serviço | Default de `price` via catálogo |
| Relatório | fee + flag de doação |
---

## 2. Role `Profissional` e páginas

### Em `/usuarios/paginas`

Incluir role **`Profissional`** na matriz (além das staff):

| Role | Default `role_pages` |
|---|---|
| Administrador / Acolhimento / Produção / Financeiro | `["*"]` (como hoje) |
| **Profissional** | `["relatorios-servicos"]` **somente** |

Adicionar opção de página:

```js
{ id: 'relatorios-servicos', label: 'Relatório de serviços' }
```

Menu staff: item **Relatórios → Serviços** (ou sob Acolhimento) apontando `/app/relatorios/servicos`, gated por `role_pages`.

### Em `/usuarios` (criar/editar)

| Campo | Uso para portal |
|---|---|
| Permissões | Checkbox / chip `Profissional` |
| Código interno | Obrigatório se role Profissional = `professional_code` |
| E-mail | Login |

Validar que `internal_code` existe em `professionals.professional_code`.

### Atalho em `/app/profissionais` (Kunk) — caminho principal

Por registro de **colaborador** (`is_collaborator`):

| Estado | UI |
|---|---|
| Sem conta | Botão **Criar conta / Enviar convite** |
| Convite pendente | Reenviar convite · Copiar link |
| Conta ativa | Indicador “Acesso ao relatório” · (opcional) desativar |

Fluxo:

1. Valida e-mail no profissional
2. Cria `system_users` com role **somente** `Profissional` + `internal_code`
3. Gera link `/cadastro?…` com **expiração**
4. Envia e-mail **quando o módulo existir**; até lá: stub + **copiar link**
5. Profissional conclui senha em `/cadastro` → login → só `/relatorio/servicos`

Não criar conta automática para prescritores que não são colaboradores.

Admin `/usuarios` continua podendo editar o `system_users` se necessário, mas o fluxo do dia a dia é em Profissionais.

---

## 3. O que não configurar nesta feature

| Item | Motivo |
|---|---|
| Relatório de pedidos | Fora do escopo |
| Integração pagamento / split | Fora |
| Utalk | Módulo futuro |
| Bônus por tags | Não portar regra SC |

---

## 4. SQL / seed (implementação)

| Artefato | Conteúdo |
|---|---|
| `alter-services-commission-validation.sql` | Coluna `commission_validation` |
| `alter-system-configs-professional-types.sql` | Seed `professional_types` + `report_settings` |
| Update `rbac.js` | Role `Profissional` + escopo `professional_id` / `internal_code` |
| Update `rolePages` / menu | Página `relatorios-servicos` |

`contest_reports` já existe em `professionals` no schema alvo.
