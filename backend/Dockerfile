# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /workspace
COPY backend/package*.json backend/tsconfig.json backend/jest.config.js backend/.npmrc ./backend/
RUN cd backend && npm install --legacy-peer-deps

FROM deps AS build
COPY shared ./shared
COPY backend/src ./backend/src
RUN cd backend && npm run build

FROM node:20-alpine AS runner
WORKDIR /workspace/backend
ENV NODE_ENV=production
COPY --from=deps /workspace/backend/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/.npmrc ./
COPY --from=build /workspace/backend/dist ./dist
COPY --from=build /workspace/backend/src/tests ./src/tests
COPY backend/data ./data
CMD ["node", "dist/server.js"]
