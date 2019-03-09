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

RUN adduser -S mclbot
RUN chown -R mclbot /mclbot
USER mclbot

CMD [ "/usr/bin/node", "/mclbot/bot.js" ]