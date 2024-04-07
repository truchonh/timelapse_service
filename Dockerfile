FROM alpine:3.12
EXPOSE 80

RUN apk update && apk upgrade

# install node and yarn
RUN apk add nodejs-current
RUN apk add yarn

# Timezone tool
RUN apk add tzdata
ENV TZ=America/Toronto
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN mkdir /lib/timelapse_service
WORKDIR /lib/timelapse_service

# explicitely copy the config first to trigger a yarn install only when needed
COPY package.json package.json
RUN yarn

COPY . .

CMD ["node", "app.js"]
