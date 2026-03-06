# ===== FRONTEND BUILD =====
FROM node:20-alpine AS client-build
WORKDIR /app/client

COPY client/package.json client/package-lock.json* ./ 
RUN npm install

COPY client/ ./
RUN npm run build

# ===== BACKEND BUILD =====
FROM node:20-alpine AS server-build
WORKDIR /app/server

COPY server/package.json server/package-lock.json* ./ 
RUN npm install

COPY server/ ./
RUN npm run build

# ===== RUNTIME IMAGE =====
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules

COPY --from=client-build /app/client/build ./client-build

ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
