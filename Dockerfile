FROM php:8.3-apache

RUN a2enmod headers \
    && sed -ri 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf \
    && sed -ri 's/<VirtualHost \*:80>/<VirtualHost *:10000>/' /etc/apache2/sites-available/000-default.conf

COPY backend/ /var/www/html/

EXPOSE 10000

CMD ["sh", "-c", "mkdir -p \"$INDICA_STORAGE_DIR\" && chown -R www-data:www-data \"$INDICA_STORAGE_DIR\" && exec apache2-foreground"]
