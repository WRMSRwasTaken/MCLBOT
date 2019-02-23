FROM amd64/alpine:edge

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

RUN yarn install --production

EXPOSE 3000 9400

RUN adduser mclbot
RUN chown mclbot /mclbot
USER mclbot

CMD [ "/usr/bin/node", "/mclbot/bot.js" ]
