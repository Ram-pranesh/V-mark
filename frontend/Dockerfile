FROM nginx:1.25-alpine

# Copy frontend assets
COPY . /usr/share/nginx/html

# Replace default site with API proxy rules for the backend service
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
