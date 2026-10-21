FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Ajusta "start" si tu script de arranque en package.json tiene otro nombre
CMD ["npm", "start"]