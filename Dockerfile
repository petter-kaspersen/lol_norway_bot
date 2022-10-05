FROM node:lts-alpine

COPY package*.json ./

RUN npm install

COPY . ./

RUN npm run build

CMD [ "node", "build/src/bot.js" ]