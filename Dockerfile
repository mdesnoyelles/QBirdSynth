FROM nginx:alpine

# Metadata
LABEL maintainer="mdesnoyelles"
LABEL description="QBirdSynth - 80s Retro-Futurism Synthesizer"
LABEL org.opencontainers.image.title="QBirdSynth"
LABEL org.opencontainers.image.description="Modern QiBrd clone - browser-based 80s synthesizer"
LABEL org.opencontainers.image.version="1.0.0"

# Copy the web app into nginx
COPY web/ /usr/share/nginx/html/

# Custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create presets volume mount point
RUN mkdir -p /usr/share/nginx/html/presets

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
