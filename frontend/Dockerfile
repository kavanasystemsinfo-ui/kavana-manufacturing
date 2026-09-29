# =============================================================================
# Kavana Manufacturing v3 — Frontend Dockerfile (Nginx multi-stage)
# Para Azure Static Web Apps no se necesita — esto es para despliegues
# que sirven frontend + backend desde el mismo dominio.
# =============================================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY logo.png ./
RUN npm ci --workspace=frontend --include-workspace-root --omit=dev=false

COPY frontend/ ./frontend/
COPY tsconfig*.json ./

RUN cd frontend && npx vite build 2>&1

# ---- Stage 2: Nginx ----
FROM nginx:stable-alpine AS production
WORKDIR /usr/share/nginx/html

# Copiar build
COPY --from=build /app/frontend/dist ./

# Configuración nginx para SPA (manejar client-side routing)
RUN rm -f /etc/nginx/conf.d/default.conf
COPY <<'NGINX' /etc/nginx/conf.d/default.conf
server {
    listen       80;
    server_name  localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        # El hostname se resuelve en cada petición: nginx cachea la IP al cargar la
        # config, y al recrear el backend Docker le da otra y la vieja acaba en la
        # base de datos (502 «Connection refused» hasta reiniciar este contenedor).
        resolver 127.0.0.11 valid=10s ipv6=off;
        set $backend http://backend:3001;
        proxy_pass $backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
NGINX

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
