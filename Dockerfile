# Build frontend
FROM node:20-alpine AS client-build
WORKDIR /app/client-3d
COPY client-3d/package*.json ./
RUN npm install
COPY client-3d/ ./
RUN npm run build

# Build backend
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Runtime
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=client-build /app/client-3d/dist ./client-build
COPY server/package*.json ./server/

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
