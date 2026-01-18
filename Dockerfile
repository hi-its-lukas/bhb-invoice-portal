FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

# Version injected at build time from GitHub release tag
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY drizzle.config.ts ./

RUN npm install drizzle-kit

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["sh", "-c", "npx drizzle-kit push && node dist/index.cjs"]
