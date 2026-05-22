# Archived Tec VM Demo Nginx Config

This file preserves the legacy Tec VM demo proxy for historical reference only.
It must not be used as an active runtime config for staging or production.

```nginx
# LEGACY / TEC VM ONLY
# This proxy was used for the Tec VM demo setup.
# It assumes the frontend is served on 10.14.255.82:4173
# and the gateway is available on 10.14.255.82:8081.
# Do not use this file as the portable production proxy.
# Keep temporarily until the new portable deployment path is validated.

events {}

http {
  server {
    listen 8090;
    server_name _;

    location / {
      proxy_pass http://10.14.255.82:4173;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /matches/ {
      proxy_pass http://10.14.255.82:8081/matches/;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /auth/ {
      proxy_pass http://10.14.255.82:8081/auth/;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /store/ {
      proxy_pass http://10.14.255.82:8081/store/;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /get_products {
      proxy_pass http://10.14.255.82:8081/get_products;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /create_checkout {
      proxy_pass http://10.14.255.82:8081/create_checkout;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /profile/ {
      proxy_pass http://10.14.255.82:8081/profile/;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```
