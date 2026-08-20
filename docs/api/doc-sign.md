# API — Doc-sign (termos e assinaturas)

> Domínio nativo da `kunk-api` para o app [`apps/doc-sign`](../../../apps/doc-sign/).
> Spec funcional completa: [`../frontend/doc-sign/`](../frontend/doc-sign/README.md).

## Prefixo

```
/api/v1/doc-sign/...
```

Aliases de transição (deprecados): `/api/v1/terms/...` → mesmos handlers.

**Não** é módulo opcional (`MODULE_*`). Faz parte do núcleo .

## Responsabilidades

1. CRUD/versionamento de **2** templates: `content_json` (TipTap/JSONB) + snapshot PDF gerado na própria API 
2. Geração de contratos a partir de `users` (+ paciente `associate_cpf`) 
3. Assinatura por token (draw/type/upload) + audit (IP, UA, timezone — sem session_id) 
4. Conclusão: PDF assinado + `users.adhesion_term` (UUID) + `associate_status` 4→5 
5. Bloqueio: no máximo um contrato `completed` por associado/e-mail 

**Sem** Document Server, LibreOffice ou DOCX canônico — ver [`../frontend/doc-sign/gaps.md`](../frontend/doc-sign/gaps.md).

## Tabelas

Ver [`../frontend/doc-sign/fields.md`](../frontend/doc-sign/fields.md) §3.

## Endpoints (resumo)

| Área | Paths |
|---|---|
| Templates | `GET/PUT/POST /doc-sign/templates…`, `POST /templates/:kind/reset` |
| Contracts | `POST/GET/DELETE /doc-sign/contracts…` (`replace_completed` no create) |
| Sign | `GET/POST /doc-sign/sign/:token…` |
| Verify | `GET /doc-sign/contracts/:id/verify` |

Detalhe de payloads: [`../frontend/doc-sign/api.md`](../frontend/doc-sign/api.md).

## Integração cadastramento

Na conclusão da assinatura (mesma API, **sem webhook**):

```
term_contracts.status = completed
users.adhesion_term = contract.id
users.associate_status = 5  (se estava 4)
```

## Status até a entrega

Stubs atuais em `kunk-api/src/routes/terms.js` retornam `TERMS_MODULE_IN_DEVELOPMENT`. 
Esta entrega os substitui pelos handlers reais.
