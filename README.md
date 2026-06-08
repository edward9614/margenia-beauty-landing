# Margenia Beauty

## Configurar Supabase

El archivo `.env.local` debe estar en la raiz del proyecto, al mismo nivel de `package.json`.

Usa este formato, sin espacios alrededor del `=` y sin comillas:

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
```

La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en `app/api/leads/route.ts`. No la expongas con `NEXT_PUBLIC_`.

Despues de cambiar `.env.local`, reinicia el servidor:

```bash
Ctrl + C
npm run dev
```
