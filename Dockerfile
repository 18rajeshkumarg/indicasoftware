FROM php:8.3-apache

RUN set -eux; \
    rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf; \
    a2enmod mpm_prefork headers; \
    sed -ri 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf; \
    sed -ri 's/<VirtualHost \*:80>/<VirtualHost *:10000>/' /etc/apache2/sites-available/000-default.conf; \
    ls -l /etc/apache2/mods-enabled | grep -i mpm; \
    apache2ctl configtest; \
    apache2ctl -M

COPY backend/ /var/www/html/

ENV INDICA_STORAGE_DIR=/var/data

EXPOSE 10000

CMD ["sh", "-c", "mkdir -p \"$INDICA_STORAGE_DIR\" && chown -R www-data:www-data \"$INDICA_STORAGE_DIR\" && exec apache2-foreground"]
