# API de Reservas — Integração WhatsApp

Base URL: `https://iljtqqhzabjghbqhuhmn.supabase.co/functions/v1`

Todas as requisições precisam do header:
```
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json
```

---

## 1. Listar quadras disponíveis

Use direto no banco via REST API do Supabase.

```
GET https://iljtqqhzabjghbqhuhmn.supabase.co/rest/v1/courts?is_active=eq.true&select=id,name,location,surface_type
apikey: <SUPABASE_ANON_KEY>
```

**Resposta:**
```json
[
  { "id": "uuid", "name": "Quadra 1", "location": "Área coberta", "surface_type": "Areia" }
]
```

---

## 2. Verificar horários disponíveis

```
GET /court-availability?court_id={uuid}&date={YYYY-MM-DD}
```

**Parâmetros de query:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `court_id` | uuid | sim | ID da quadra |
| `date` | string | sim | Data no formato `2025-12-31` |

**Exemplo:**
```
GET /court-availability?court_id=abc-123&date=2025-12-31
```

**Resposta 200:**
```json
{
  "date": "2025-12-31",
  "court_id": "abc-123",
  "court_name": "Quadra 1",
  "available_slots": [
    { "start": "08:00", "end": "09:00" },
    { "start": "10:00", "end": "11:00" },
    { "start": "14:00", "end": "15:00" }
  ]
}
```

**Erros:**
| Status | Mensagem |
|--------|----------|
| 400 | `court_id e date são obrigatórios` |
| 404 | `Quadra não encontrada ou inativa` |

---

## 3. Criar reserva

```
POST /court-availability
```

**Body JSON:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `court_id` | uuid | sim | ID da quadra |
| `date` | string | sim | Data no formato `YYYY-MM-DD` |
| `start_time` | string | sim | Horário de início `HH:MM` |
| `end_time` | string | sim | Horário de fim `HH:MM` (normalmente start + 1h) |
| `requester_name` | string | sim | Nome completo do solicitante |
| `requester_phone` | string | sim | Telefone com DDD (somente dígitos, ex: `11999990000`) |
| `price` | number | não | Valor da reserva em reais. Se omitido, usa o padrão do sistema |

**Exemplo:**
```json
{
  "court_id": "abc-123",
  "date": "2025-12-31",
  "start_time": "14:00",
  "end_time": "15:00",
  "requester_name": "João Silva",
  "requester_phone": "11999990000",
  "price": 80
}
```

**Resposta 201:**
```json
{
  "booking_id": "uuid-da-reserva",
  "status": "requested",
  "message": "Reserva solicitada com sucesso. Aguarde confirmação."
}
```

**Erros:**
| Status | Mensagem |
|--------|----------|
| 400 | `Campos obrigatórios: court_id, date, start_time, end_time, requester_name, requester_phone` |
| 400 | `start_time deve ser anterior a end_time` |
| 409 | `Horário não disponível para esta data` |

---

## 4. Listar reservas do usuário

```
GET /list-bookings?phone={telefone}
```

**Parâmetros de query:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `phone` | string | sim | Telefone com DDD (somente dígitos) |

**Exemplo:**
```
GET /list-bookings?phone=11999990000
```

**Resposta 200:**
```json
{
  "bookings": [
    {
      "id": "uuid",
      "date": "2025-12-31",
      "start_time": "14:00:00",
      "end_time": "15:00:00",
      "status": "confirmed",
      "courts": { "name": "Quadra 1" }
    }
  ]
}
```

Retorna até as **últimas 5 reservas não canceladas**, ordenadas pela data mais recente.

**Status possíveis:**
| Status | Descrição |
|--------|-----------|
| `requested` | Aguardando confirmação do admin |
| `confirmed` | Confirmada pelo admin |
| `paid` | Paga — pronto para usar |
| `cancelled` | Cancelada |

---

## 5. Cancelar reserva

```
POST /cancel-booking
```

**Body JSON:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `booking_id` | uuid | sim | ID da reserva (obtido em `list-bookings`) |
| `requester_phone` | string | sim | Telefone do solicitante (validação de ownership) |

**Exemplo:**
```json
{
  "booking_id": "uuid-da-reserva",
  "requester_phone": "11999990000"
}
```

**Resposta 200:**
```json
{
  "status": "cancelado",
  "message": "Reserva cancelada com sucesso."
}
```

**Erros:**
| Status | Mensagem |
|--------|----------|
| 400 | `booking_id e requester_phone são obrigatórios` |
| 403 | `Reserva não pertence a este número` |
| 404 | `Reserva não encontrada` |
| 409 | `Reserva já cancelada` |
| 409 | `Reservas pagas não podem ser canceladas pelo chatbot. Entre em contato com a equipe.` |

---

## Fluxo sugerido para o bot WhatsApp

```
1. Usuário envia "reservar"
   → Bot pergunta para qual data

2. Usuário informa a data
   → Bot chama GET /court-availability para listar quadras e horários livres
   → Apresenta opções numeradas

3. Usuário escolhe quadra e horário
   → Bot solicita nome completo

4. Usuário informa nome
   → Bot chama POST /court-availability com os dados
   → Confirma: "Reserva solicitada! Você receberá a confirmação em breve."

5. Usuário envia "minhas reservas"
   → Bot chama GET /list-bookings?phone={numero}
   → Lista reservas ativas com status

6. Usuário envia "cancelar reserva"
   → Bot chama GET /list-bookings para mostrar as opções
   → Usuário escolhe qual cancelar
   → Bot chama POST /cancel-booking com booking_id + phone
```

---

## Notas de implementação

- O telefone é normalizado automaticamente (remove `+55`, espaços, hífens). Envie somente os dígitos: `11999990000`.
- A reserva entra com status `requested` e fica aguardando confirmação do admin no painel.
- Quando o admin confirma, o status muda para `confirmed`. O bot pode checar `list-bookings` para notificar o usuário.
- Reservas com status `paid` não podem ser canceladas pelo bot — o cliente precisa entrar em contato com a equipe.
