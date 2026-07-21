---
id: servicos-google-calendar
title: Google Calendar
section: servicos-externos
adminPath: /servicos-externos/google_calendar
keywords: [google, calendar, agenda, agendamento, oauth]
order: 95
---

## Para que serve

Conecta a **agenda Google** da associação aos agendamentos de serviços no Kunk.

## Credenciais (OAuth)

Client ID e Client Secret de um app Web no Google Cloud, com a Calendar API ligada.

### Passo a passo

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e selecione (ou crie) o projeto.
2. Em **APIs e serviços → Biblioteca**, ative a [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com).
3. Configure a **Tela de consentimento OAuth**.
4. Crie um cliente do tipo **Aplicativo da Web**.
5. Em URIs de redirecionamento, cole a **Redirect URI** do Admin.
6. Copie **Client ID** e **Client Secret** → **Autenticar** (abre o Google para autorizar).
7. Escolha o **calendário principal**.
8. Ative o módulo e **Usar no agendamento**.

## Documentação oficial

- [Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
