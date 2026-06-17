# Luna — Agente WhatsApp IA para Cafeteria Luna Test

Sistema de agente WhatsApp con IA para cafeteria de especialidad.
Incluye catalogo digital con 10 productos pre-cargados, gestion de pedidos, notificaciones al dueno y dashboard.

## Requisitos

- Node.js >= 22.0.0
- npm >= 10
- Una cuenta de OpenAI con API key

## Instalacion

```bash
npm install
cp .env.example .env.local
# Editar .env.local con tu OPENAI_API_KEY real
```

## Uso

```bash
# Dashboard + bot juntos
npm run start:all

# Solo el bot
npm run start:bot

# Solo el dashboard
npm run dev
```

Al iniciar por primera vez, abre http://localhost:3000, ingresa con admin / Password123*,
presiona "Conectar WhatsApp" y escanea el QR con tu telefono.

## Caracteristicas

- Agente IA conversacional con GPT-4o-mini
- Catalogo digital con panel de edicion en vivo
- Gestion de pedidos con estados (pendiente, preparando, entregado, cancelado)
- Notificaciones al dueno por WhatsApp
- Modo AI/HUMAN por conversacion
- Dashboard con autenticacion admin
- Tema oscuro con variables CSS personalizables
- 10 productos pre-cargados listos para usar

## Variables de entorno

| Variable | Descripcion |
|---|---|
| `OPENAI_API_KEY` | API Key de OpenAI (requerido) |
| `OWNER_WHATSAPP` | WhatsApp del dueno para notificaciones |
| `ADMIN_USER` | Usuario del dashboard (default: admin) |
| `ADMIN_PASS_HASH` | Hash SHA-256 de la contrasena |

## Seguridad

El dashboard tiene autenticacion basica. Para exponerlo a internet:
- Usa Cloudflare Zero Trust
- Usa un proxy reverso con Basic Auth (nginx + htpasswd)
- NO expongas el puerto 3000 directamente
