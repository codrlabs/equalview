# Phase 1: bare Node container (no Puppeteer system deps yet — those
# land in Phase 2 alongside the real scanner).
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=development
EXPOSE 3000

CMD ["npm", "run", "dev"]
