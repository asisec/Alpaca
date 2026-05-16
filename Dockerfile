FROM node:18-alpine

WORKDIR /app

# Server bağımlılıklarını kur
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Uygulama dosyalarını kopyala
COPY server/index.js ./server/
COPY electron-app/index.html ./electron-app/
COPY electron-app/styles.css ./electron-app/
COPY electron-app/renderer.js ./electron-app/

EXPOSE 3000

CMD ["node", "server/index.js"]
