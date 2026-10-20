# Multi-stage build for React Frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Cache dependencies with lockfile support
COPY package.json package-lock.json* ./
RUN npm install

# Build project
COPY . .
RUN npm run build

# Nginx production image
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    # Hỗ trợ tải file ảnh đại diện và dữ liệu lớn lên tới 50MB
    client_max_body_size 50M;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Hỗ trợ streaming video và API thời gian dài
        proxy_read_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
    }
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
