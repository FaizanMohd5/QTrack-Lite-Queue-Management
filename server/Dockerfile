FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci --workspaces --include-workspace-root --no-audit --no-fund
COPY server ./server
COPY client ./client
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci --omit=dev --omit=optional --workspace server --include-workspace-root --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
USER node
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "dist/server.js"]
