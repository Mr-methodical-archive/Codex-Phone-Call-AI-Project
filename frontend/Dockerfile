# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /workspace
COPY frontend/package*.json frontend/tsconfig.json frontend/vite.config.ts frontend/postcss.config.js frontend/tailwind.config.js frontend/.npmrc ./frontend/
RUN cd frontend && npm install --legacy-peer-deps

FROM deps AS build
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM node:20-alpine AS runner
WORKDIR /workspace/frontend
ENV NODE_ENV=production
COPY --from=deps /workspace/frontend/node_modules ./node_modules
COPY --from=build /workspace/frontend/dist ./dist
COPY frontend/package*.json ./
COPY frontend/.npmrc ./
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
