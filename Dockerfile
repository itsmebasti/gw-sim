FROM node:19.4.0-alpine3.16

RUN apk add git bash

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN ls / && pwd

WORKDIR /code

EXPOSE 80/tcp

ENTRYPOINT [ "/entrypoint.sh" ]
