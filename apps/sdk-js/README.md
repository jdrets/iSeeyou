# @iseeyou/sdk

SDK de browser para [ISeeYou](https://github.com/) — captura errores, Core Web Vitals y eventos custom, y los envía a `POST /track` de ingest-api.

Bundle objetivo: **≤ 5 KB gzip**.

## Instalación

### npm / pnpm / yarn

```bash
pnpm add @iseeyou/sdk
```

En el monorepo ISeeYou:

```bash
pnpm add @iseeyou/sdk --filter tu-app
# o dependency: "@iseeyou/sdk": "workspace:*"
```

```ts
import { ISeeYou } from '@iseeyou/sdk'
// también: import { init, captureEvent } from '@iseeyou/sdk'

ISeeYou.init({
  endpoint: 'http://localhost:8080/track',
  // trackWebVitals: true, // opcional, default false
  // sampleRate: 0.1,
  // userId: 'user_123',
})

ISeeYou.setUser(currentUser?.id ?? null)
ISeeYou.captureEvent('checkout_started', { plan: 'pro' })
ISeeYou.captureException(err, { route: '/checkout' })
```

Llamá `init` una sola vez en el entry de la app (`main.tsx`, layout raíz, etc.).

### Script tag (IIFE)

```html
<script src="/path/to/iseeyou.iife.js" defer></script>
<script>
  ISeeYou.init({ endpoint: 'https://ingest.example.com/track' })
</script>
```

Artefacto local tras `pnpm build`: `dist/iseeyou.iife.js`.

## API

| Método | Descripción |
|--------|-------------|
| `ISeeYou.init({ endpoint, sampleRate?, userId?, trackWebVitals? })` | Arranca listeners y transporte |
| `ISeeYou.captureException(error, extra?)` | Error manual |
| `ISeeYou.captureEvent(name, properties?)` | Evento custom |
| `ISeeYou.setUser(userId \| null)` | Asocia `user_id` a eventos siguientes |

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
pnpm --filter @iseeyou/sdk test
pnpm --filter @iseeyou/sdk build
```

El build falla si el gzip de `dist/iseeyou.js` o `dist/iseeyou.iife.js` supera 5 KB.
