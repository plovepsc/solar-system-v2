FROM node:18-alpine3.17

WORKDIR /usr/app

COPY package*.json /usr/app/

RUN npm install

COPY . .

ENV MONGO_URI=mongodb://172.25.83.246/superData
ENV MONGO_USERNAME=saddam
ENV MONGO_PASSWORD=saddam@Sb!

EXPOSE 3000

CMD [ "npm", "start" ]