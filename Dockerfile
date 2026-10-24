# Initial container for a browser-accessible terminal and Antigravity CLI.
# NOTE: Do not deploy until the official CLI installer and authentication flow
# have been verified for this runtime. Heroku dyno filesystems are ephemeral.
FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=8080
ENV HOME=/home/app

RUN apt-get update \
 && apt-get install -y --no-install-recommends bash ca-certificates curl git python3 python3-pip tini \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --home-dir /home/app --shell /bin/bash app

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js start.sh ./
RUN chmod +x /app/start.sh \
 && chown -R app:app /app /home/app

USER app
EXPOSE 8080
CMD ["/usr/bin/tini", "--", "/app/start.sh"]
