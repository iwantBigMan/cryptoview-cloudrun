FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN node ./node_modules/typescript/bin/tsc

ENV PORT=8080

CMD ["node", "dist/index.js"]