FROM nginx:latest

RUN apt-get update && apt-get -y install apache2-utils

COPY html-public /usr/share/nginx/html-public
COPY controls /usr/share/nginx/controls

COPY nginx-*.conf /etc/nginx/

RUN curl https://ssl-config.mozilla.org/ffdhe2048.txt > /usr/share/nginx/dhparam

COPY run.sh .
RUN chmod u+x run.sh

EXPOSE 443/tcp 80/tcp

ENTRYPOINT ["/run.sh"]
CMD ["nginx", "-g", "daemon off;"]