FROM node:19.4.0-alpine3.16

RUN apk add git bash

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /code

EXPOSE 3001/tcp

ENTRYPOINT [ "/entrypoint.sh" ]
