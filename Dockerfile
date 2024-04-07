FROM ubuntu:20.04

# prevent interactive prompts (issue with tzdata)
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get upgrade -y

# install node
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# install yarn
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt update && apt-get install yarn -y
RUN echo "alias node=nodejs" >> ~/.bashrc

# install global ffmpeg
RUN npm install -g ffmpeg

# install handbrake cli + ffmpeg
RUN apt install software-properties-common -y
RUN apt-get update
RUN apt-get install ffmpeg -y

RUN mkdir /lib/timelapse_service
WORKDIR /lib/timelapse_service

# explicitely copy the config first to trigger a yarn install only when needed
COPY package.json package.json
RUN yarn

COPY . .

CMD ["node", "app.js"]
