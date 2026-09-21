# Orbital Station is a static SPA — no backend, no env vars, no API.
# Stage 1 builds it; stage 2 serves the output with nginx. Node never ships
# in the final image.

FROM node:26-alpine AS build
WORKDIR /app

# Separate from the source copy so `npm ci` only reruns when deps actually change.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS run
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O- http://localhost/ || exit 1
