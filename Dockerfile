# ===== GLOBE.GL BUILD =====
FROM node:20-alpine AS globe-build
WORKDIR /app/globe
COPY globe.gl/package.json ./
RUN npm install --ignore-scripts
COPY globe.gl/dist ./dist

# ===== FRONTEND BUILD (3D) =====
FROM node:20-alpine AS client-build
WORKDIR /app/client-3d

# Install client dependencies
COPY client-3d/package.json client-3d/package-lock.json* ./ 
RUN npm install --ignore-scripts

# Copy custom-globe from globe-build
COPY --from=globe-build /app/globe/dist ./node_modules/custom-globe/

# Copy client-3d source and build
COPY client-3d/src ./src
COPY client-3d/index.html ./
COPY client-3d/vite.config.ts ./
COPY client-3d/tsconfig.json ./
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

COPY --from=client-build /app/client-3d/dist ./client-build

ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
