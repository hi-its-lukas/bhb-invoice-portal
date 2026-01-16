FROM node:18-alpine

RUN apk add --no-cache docker-cli docker-cli-compose

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
