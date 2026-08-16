---
title: Backup e dados
description: Cuidados com PostgreSQL, storage e seeds.
---

## Banco

Faça backup regular do PostgreSQL da instância (`pg_dump` / snapshots do provedor).

## Arquivos

Arquivos podem viver em disco (`STORAGE_PATH`), S3 ou GCS conforme `FILES_DRIVER`. Inclua o bucket ou volume no plano de backup.

## Seeds e limpeza (dev)

No pacote `kunk-api` existem scripts de seed e limpeza (`seed:sample`, `clean:db`, etc.) — **apenas para desenvolvimento**. Nunca rode limpeza destrutiva em produção.
