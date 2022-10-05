FROM node:lts-alpine

COPY package*.json ./

RUN npm install

COPY . ./

CMD [ "npx", "ts-node", "src/bot.ts" ]