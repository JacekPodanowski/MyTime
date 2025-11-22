FROM node:18-alpine

WORKDIR /app

# Zainstaluj zależności systemowe dla better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000
EXPOSE 5001

CMD ["npm", "start"]
