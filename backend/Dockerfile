# Phase 2: Node + system Chromium for Puppeteer.
#
# Puppeteer's bundled Chrome download doesn't work on Alpine (musl libc), so
# we install Chromium via apk and tell Puppeteer to use that binary instead
# of downloading its own.
FROM node:22-alpine

# Chromium + the runtime libs/fonts it needs in a headless container.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Skip Puppeteer's Chrome download during `npm install` and point it at the
# system binary. These must be set before `npm install` runs.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=development
EXPOSE 3000

CMD ["npm", "run", "dev"]
