FROM node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && apk del .build-deps
COPY --from=build /app/build ./build
COPY --from=build /app/app/db/migrations ./app/db/migrations
COPY server.js ./server.js

# A named volume inherits the ownership of the image path it mounts over, so
# these have to exist and belong to `node` *before* the volume is created —
# otherwise Docker creates them root-owned and the unprivileged process below
# can't write the database, the photos, or a backup. Bind mounts keep the
# host's ownership instead, which is what APP_UID/APP_GID in
# docker-compose.yml are for.
RUN mkdir -p /data/database /data/uploads /backups && chown -R node:node /data /backups

# Unprivileged by default — the app only ever writes to /data and /backups,
# both created above. compose overrides this via `user:` when a bind-mounted
# data directory is owned by some other uid on the host.
USER node

# Documentation only; the process actually listens on $PORT (APP_PORT in
# compose), which defaults to this.
EXPOSE 3000
CMD ["node", "--env-file-if-exists=.env", "server.js"]
