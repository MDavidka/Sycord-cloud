FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=8080
ENV HOME=/home/app
ENV PATH="/home/app/.local/bin:${PATH}"

RUN apt-get update \
 && apt-get install -y --no-install-recommends bash ca-certificates curl git python3 python3-pip tini \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --home-dir /home/app --shell /bin/bash app

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

COPY server.js start.sh ./
RUN chmod +x /app/start.sh \
 && chown -R app:app /app /home/app

USER app
RUN curl -fsSL https://antigravity.google/cli/install.sh | bash \
 && /home/app/.local/bin/agy --version

EXPOSE 8080
CMD ["/usr/bin/tini", "--", "/app/start.sh"]
