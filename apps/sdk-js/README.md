# @seeyou/sdk

SDK de browser para [SeeYou](https://github.com/) — captura errores, Core Web Vitals y eventos custom, y los envía a `POST /track` de ingest-api.

Bundle objetivo: **≤ 5 KB gzip**.

## Instalación

### npm / pnpm / yarn

```bash
pnpm add @seeyou/sdk
```

En el monorepo SeeYou:

```bash
pnpm add @seeyou/sdk --filter tu-app
# o dependency: "@seeyou/sdk": "workspace:*"
```

```ts
import { SeeYou } from '@seeyou/sdk'
// también: import { init, captureEvent } from '@seeyou/sdk'

SeeYou.init({
  endpoint: 'http://localhost:8080/track',
  // trackWebVitals: true, // opcional, default false
  // sampleRate: 0.1,
  // userId: 'user_123',
})

SeeYou.setUser(currentUser?.id ?? null)
SeeYou.captureEvent('checkout_started', { plan: 'pro' })
SeeYou.captureException(err, { route: '/checkout' })
```

Llamá `init` una sola vez en el entry de la app (`main.tsx`, layout raíz, etc.).

### Script tag (IIFE)

```html
<script src="/path/to/seeyou.iife.js" defer></script>
<script>
  SeeYou.init({ endpoint: 'https://ingest.example.com/track' })
</script>
```

Artefacto local tras `pnpm build`: `dist/seeyou.iife.js`.

## API

| Método | Descripción |
|--------|-------------|
| `SeeYou.init({ endpoint, sampleRate?, userId?, trackWebVitals? })` | Arranca listeners y transporte |
| `SeeYou.captureException(error, extra?)` | Error manual |
| `SeeYou.captureEvent(name, properties?)` | Evento custom |
| `SeeYou.setUser(userId \| null)` | Asocia `user_id` a eventos siguientes |

Automático tras `init`:

- `window` `error` + `unhandledrejection`
- Web Vitals (LCP, INP, CLS, TTFB, FCP) solo si `trackWebVitals: true`

## Payload / transporte

Al flush, el SDK manda **un solo POST** con todos los eventos encolados:

```json
{
  "events": [
    { "type": "error | web_vital | event", "timestamp": 1720000000000, "payload": {} }
  ]
}
```

ingest-api también acepta un evento suelto (sin `events`) para curls y clientes simples.

## Desarrollo

```bash
pnpm install
pnpm --filter @seeyou/sdk test
pnpm --filter @seeyou/sdk build
```

El build falla si el gzip de `dist/seeyou.js` o `dist/seeyou.iife.js` supera 5 KB.
