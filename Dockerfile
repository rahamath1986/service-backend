FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# Remove development dependencies and unused engines after build
RUN npm prune --omit=dev && \
    rm -rf node_modules/prisma node_modules/typescript node_modules/@types node_modules/.prisma/client/*debian*



# --------------------------------------------------
# Production
# --------------------------------------------------

FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=8080

RUN mkdir -p /app/uploads

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 8080

CMD ["node", "dist/main.js"]
