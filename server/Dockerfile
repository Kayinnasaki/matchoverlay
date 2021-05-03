FROM node:14

RUN apt-get update && apt-get -y install gettext-base

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .
RUN chmod u+x run.sh

RUN npm install


EXPOSE 8082/tcp 8083/tcp

ENTRYPOINT ["/usr/src/app/run.sh"]
CMD [ "node", "index.js" ]
