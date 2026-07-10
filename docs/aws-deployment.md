# SeeYou — Guía de deploy en AWS

Guía paso a paso para levantar SeeYou en un **EC2 self-hosted** (alineado con el diseño del proyecto: 2–4 vCPU, 4–8 GB RAM).

## Arquitectura en producción

```
Internet
   │
   ├─ https://app.tudominio.com      → Nginx + PHP-FPM (Laravel dashboard)
   └─ https://ingest.tudominio.com   → Nginx → ingest-api (Go, :8080)

EC2 (misma máquina)
   ├─ Docker: clickhouse, postgres, ingest-api
   └─ Host:  nginx, php-fpm, Laravel (apps/dashboard)
```


| Componente                        | Dónde corre    | Puerto interno             |
| --------------------------------- | -------------- | -------------------------- |
| Dashboard (Laravel + React build) | Host (PHP-FPM) | 9000 (unix socket)         |
| ingest-api                        | Docker         | 8080                       |
| ClickHouse                        | Docker         | 8123 (HTTP), 9000 (native) |
| PostgreSQL                        | Docker         | 5432 (mapeado a host 5433) |


El SDK del browser apunta a `https://ingest.tudominio.com/track`. El dashboard solo lo usan admins; no necesita CORS público para analytics.

---



## 1. Crear la instancia EC2



### Tipo de instancia recomendado

Para una **primera prueba en producción** con poco tráfico, no hace falta una máquina grande. Priorizá **Graviton (ARM, familia `t4g`)**: suele costar ~20 % menos que `t3` equivalente y el stack de SeeYou corre bien en ARM (Docker images de ClickHouse, Postgres y el build de Go son multi-arch).

| Perfil | Instancia | vCPU | RAM | Cuándo usarla |
| ------ | --------- | ---- | --- | ------------- |
| Prueba en prod (recomendado) | `t4g.large` | 2 | 8 GB | Primer deploy, pocos usuarios, validar ingesta + dashboard |
| Mínimo ajustado | `t4g.medium` | 2 | 4 GB | Solo si el presupuesto aprieta; ClickHouse + Postgres comparten RAM y puede quedar justo |
| Si preferís x86 | `t3.large` | 2 | 8 GB | Misma capacidad que `t4g.large`, un poco más cara |
| Escala posterior | `t4g.xlarge` | 4 | 16 GB | Cuando el volumen de eventos o las queries analíticas suban |

**Para tu caso (probar en producción):** `t4g.large` es una buena elección — 8 GB dan margen para ClickHouse, Postgres, ingest-api y PHP-FPM sin apurar la RAM, y pagás menos que un `t3.large`.

> **ARM:** Usá AMI **Ubuntu 24.04 ARM64**. El `docker compose up --build` compila ingest-api en la propia instancia; no necesitás cambios en el código.




### AMI y disco

- **AMI:** Ubuntu 24.04 LTS **ARM64** (para `t4g`) o amd64 (solo si elegís `t3`)
- **Disco:** 50–100 GB gp3 (ClickHouse crece con el tiempo; TTL 30 días limita el uso)



### Security Group (inbound)


| Puerto | Origen           | Uso                       |
| ------ | ---------------- | ------------------------- |
| 22     | Tu IP fija / VPN | SSH                       |
| 80     | `0.0.0.0/0`      | HTTP (redirect + certbot) |
| 443    | `0.0.0.0/0`      | HTTPS                     |


**No abras** al público: `5433`, `8123`, `9000`, `8080`. Esos servicios quedan en `127.0.0.1` o en la red Docker interna.

### DNS (Route 53 u otro)

Creá dos registros `A` apuntando a la IP pública del EC2:

- `app.tudominio.com` → dashboard
- `ingest.tudominio.com` → ingest-api

---



## 2. Preparar el servidor

Conectate por SSH y actualizá el sistema:

```bash
sudo apt update && sudo apt upgrade -y
```



### Instalar dependencias

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# Cerrá sesión y volvé a entrar para que tome el grupo docker

# Docker Compose plugin (viene con Docker reciente; verificar)
docker compose version

# Nginx + PHP 8.3
sudo apt install -y nginx php8.3-fpm php8.3-cli php8.3-pgsql php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-intl unzip git

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node 20 + pnpm (solo para build del frontend; no corre en producción)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable && sudo corepack prepare pnpm@9.15.0 --activate
```



### Certificados SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---



## 3. Clonar el repo

```bash
sudo mkdir -p /var/www/seeyou
sudo chown $USER:$USER /var/www/seeyou
git clone https://github.com/TU_ORG/seeyou.git /var/www/seeyou
cd /var/www/seeyou
```

---



## 4. Infraestructura Docker (ClickHouse + Postgres + ingest-api)



### Cambiar credenciales por defecto

Editá `docker-compose.yml` y reemplazá `seeyou_secret` por contraseñas fuertes en:

- `clickhouse` → `CLICKHOUSE_PASSWORD`
- `postgres` → `POSTGRES_PASSWORD`
- `ingest-api` → `CLICKHOUSE_PASSWORD`

> Guardá esas mismas credenciales; las vas a usar en el `.env` del dashboard.



### Levantar servicios

```bash
cd /var/www/seeyou
docker compose up --build -d
docker compose ps
```

Verificá salud:

```bash
curl -s http://127.0.0.1:8080/health
curl -s http://127.0.0.1:8123/ping
```



### Persistencia

Los volúmenes `clickhouse_data`, `postgres_data` y `clickhouse_logs` sobreviven a `docker compose down`. Para backup, snapshot del volumen EBS o `docker exec` + dump (ver sección 9).

---



## 5. Dashboard Laravel

```bash
cd /var/www/seeyou/apps/dashboard
cp .env.example .env
```



### `.env` de producción (ejemplo)

```dotenv
APP_NAME=SeeYou
APP_ENV=production
APP_KEY=                    # generar con artisan key:generate
APP_DEBUG=false
APP_URL=https://app.tudominio.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5433
DB_DATABASE=seeyou
DB_USERNAME=seeyou
DB_PASSWORD=TU_PASSWORD_POSTGRES

CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_DB=seeyou
CLICKHOUSE_USER=seeyou
CLICKHOUSE_PASSWORD=TU_PASSWORD_CLICKHOUSE
CLICKHOUSE_TIMEOUT=30

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true

CACHE_STORE=database
QUEUE_CONNECTION=database

LOG_CHANNEL=stack
LOG_LEVEL=warning
```



### Instalar, migrar y compilar assets

```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
# Opcional: usuario inicial
# php artisan db:seed --force

npm install --ignore-scripts
npm run build

php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Permisos de Laravel:

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R ug+rwx storage bootstrap/cache
```

---



## 6. Nginx



### Dashboard — `/etc/nginx/sites-available/seeyou-app`

```nginx
server {
    listen 80;
    server_name app.tudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.tudominio.com;
    root /var/www/seeyou/apps/dashboard/public;

    index index.php;
    charset utf-8;

    # Certbot rellena estas líneas:
    # ssl_certificate /etc/letsencrypt/live/app.tudominio.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/app.tudominio.com/privkey.pem;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```



### ingest-api — `/etc/nginx/sites-available/seeyou-ingest`

```nginx
server {
    listen 80;
    server_name ingest.tudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ingest.tudominio.com;

    # ssl_certificate ...
    # ssl_certificate_key ...

    # Límite alineado con ingest-api (64 KB body máx.)
    client_max_body_size 64k;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activar sitios:

```bash
sudo ln -s /etc/nginx/sites-available/seeyou-app /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/seeyou-ingest /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```



### SSL

```bash
sudo certbot --nginx -d app.tudominio.com -d ingest.tudominio.com
```

Renovación automática: certbot instala un timer systemd.

---



## 7. Instalar el SDK en tu frontend

En la app que querés monitorear:

```js
import SeeYou from '@seeyou/sdk' // o el bundle que publiques

SeeYou.init({
  endpoint: 'https://ingest.tudominio.com/track',
  sampleRate: 1,
  userId: 'optional-user-id',
})
```

Verificá ingesta:

```bash
curl -X POST https://ingest.tudominio.com/track \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"event\",
    \"timestamp\": $(date +%s000),
    \"payload\": {
      \"event_type\": \"custom\",
      \"event_name\": \"deploy_test\",
      \"url\": \"https://example.com/\"
    }
  }"
```

Respuesta esperada: `{"status":"accepted","count":1}`

Luego entrá al dashboard en `https://app.tudominio.com/logs` y confirmá que el evento aparece.

---



## 8. Deploy de actualizaciones

Script típico después de `git pull`:

```bash
cd /var/www/seeyou

# Infra + ingest-api
docker compose up --build -d

# Dashboard
cd apps/dashboard
composer install --no-dev --optimize-autoloader
php artisan migrate --force
npm ci --ignore-scripts
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
sudo systemctl reload php8.3-fpm
```

---



## 9. Backups



### PostgreSQL (usuarios, sesiones, alertas)

```bash
docker exec seeyou_postgres pg_dump -U seeyou seeyou \
  | gzip > /var/backups/seeyou-postgres-$(date +%F).sql.gz
```



### ClickHouse

Opción simple: snapshot del volumen EBS en horario de bajo tráfico.

Consulta de tablas para export manual:

```bash
docker exec seeyou_clickhouse clickhouse-client \
  --user seeyou --password TU_PASSWORD \
  --database seeyou \
  --query "SELECT count() FROM errors"
```



### Automatizar con cron

```bash
sudo mkdir -p /var/backups
sudo crontab -e
```

```
0 3 * * * docker exec seeyou_postgres pg_dump -U seeyou seeyou | gzip > /var/backups/seeyou-pg-$(date +\%F).sql.gz
```

Subí los dumps a S3 con `aws s3 cp` si querés off-site backup.

---



## 10. Checklist de seguridad

- [ ] `APP_DEBUG=false` en producción
- [ ] Contraseñas distintas a `seeyou_secret`
- [ ] Security Group sin puertos de DB/analytics expuestos
- [ ] HTTPS en app e ingest
- [ ] `SESSION_SECURE_COOKIE=true`
- [ ] SSH solo con key pair (deshabilitar password auth)
- [ ] Firewall OS opcional: `ufw allow 22,80,443/tcp && ufw enable`
- [ ] Rotar `APP_KEY` solo en instalación nueva (rompe sesiones existentes)

---



## 11. Troubleshooting


| Síntoma                          | Qué revisar                                                            |
| -------------------------------- | ---------------------------------------------------------------------- |
| Dashboard 500                    | `apps/dashboard/storage/logs/laravel.log`, permisos `storage/`         |
| Logs vacíos en UI                | `CLICKHOUSE_*` en `.env`, `curl http://127.0.0.1:8123/ping`            |
| SDK no envía eventos             | CORS (ingest-api ya envía `*`), URL del endpoint, consola del browser  |
| `Address already in use` en 8080 | `docker compose ps`, otro proceso en el puerto                         |
| Assets rotos (CSS/JS)            | Correr `npm run build`, verificar `public/build/` existe               |
| Login no persiste                | `SESSION_DRIVER=database`, migraciones corridas, cookie secure + HTTPS |


Logs útiles:

```bash
docker logs seeyou_ingest_api --tail 100
docker logs seeyou_clickhouse --tail 50
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u php8.3-fpm -f
```

---



## 12. Escalar más adelante (opcional)

Si el volumen crece, podés separar componentes sin cambiar el código:


| Componente | Servicio AWS                       |
| ---------- | ---------------------------------- |
| PostgreSQL | RDS PostgreSQL                     |
| ClickHouse | EC2 dedicado o ClickHouse Cloud    |
| ingest-api | ECS/Fargate detrás de ALB          |
| Dashboard  | Misma EC2 o segundo instance + ALB |


Para la mayoría de instalaciones self-hosted, **un solo EC2 `t4g.large` + Docker** alcanza para arrancar en producción; escalá a `t4g.xlarge` cuando el volumen lo pida.

---



## Referencias en el repo

- Infra local: `docker-compose.yml`
- Variables dashboard: `apps/dashboard/.env.example`
- Comandos de desarrollo: `dev-commands.md`
- Arquitectura: `architecture.md`
- SDK: `apps/sdk-js/README.md`

