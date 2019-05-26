FROM node:lts-alpine
ENV HOME=/
RUN mkdir -p $HOME/app/src
COPY ./app/package.json $HOME/app
COPY ./app/src/app.js $HOME/app/src/
WORKDIR $HOME/app
RUN npm install
RUN rm -f $HOME/app/*.env* && rm -rf $HOME/app/src/*.env*