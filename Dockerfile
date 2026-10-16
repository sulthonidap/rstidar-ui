# ---- build ----
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts/ensure-native-deps.mjs scripts/
# npm can silently skip native optional deps (rolldown, lightningcss…); the script adds any it missed.
RUN npm ci && node scripts/ensure-native-deps.mjs

COPY . .

# Vite bakes env vars into the bundle at build time
ARG VITE_API_URL
ARG VITE_APK_URL
ARG VITE_APK_VERSION
ARG VITE_APK_SIZE
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APK_URL=$VITE_APK_URL \
    VITE_APK_VERSION=$VITE_APK_VERSION \
    VITE_APK_SIZE=$VITE_APK_SIZE

RUN npm run build

# ---- serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
