FROM node:22.14.0-alpine3.21

RUN apk add git bash

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /code

EXPOSE 3001/tcp

ENTRYPOINT [ "/entrypoint.sh" ]
