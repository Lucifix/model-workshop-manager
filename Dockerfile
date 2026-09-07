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
EXPOSE 3000
CMD ["node", "--env-file-if-exists=.env", "server.js"]
