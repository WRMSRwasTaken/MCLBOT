FROM amd64/alpine:latest

RUN apk add --update \
ffmpeg \
imagemagick \
nodejs-current \
python2 \
yarn \
git \
make \
g++

WORKDIR /mclbot

COPY . .

RUN yarn install

CMD [ "/usr/bin/node", "/mclbot/bot.js" ]
