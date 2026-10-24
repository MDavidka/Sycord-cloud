# Sycord Cloud — Antigravity CLI container

This repository contains an **experimental starting point** for running Google's Antigravity CLI (`agy`) in a Heroku container.

## Current status

- Docker image installs the official `agy` CLI during image build.
- Express app exposes a small password-protected landing page.
- **This is not yet a usable browser terminal.** The current `/terminal` route is only a status page; a real interactive terminal needs a carefully secured PTY + browser terminal implementation.
- Do not deploy to Heroku until the image is tested and you explicitly approve any billable resource.
- Heroku dyno filesystems are ephemeral. Keep project files in Git or durable external storage.

## Local image build

Requires Docker on a computer or cloud build environment:

```sh
docker build -t sycord-cloud .
```

The image build checks `agy --version`. It does not authenticate the Google account or launch a session.

## Required environment variable

Before running the web app, set `TERMINAL_PASSWORD` to a unique random password of at least 20 characters. Never commit the password, Google credentials, or API keys to this repository.

## Important authentication note

The Antigravity CLI supports interactive authentication. A remote browser terminal must be tested to verify that the chosen sign-in flow works in a headless container. No authentication credentials are included in this repository.

## Official references

- [Antigravity CLI getting started](https://antigravity.google/docs/cli-getting-started)
- [Antigravity CLI authentication](https://www.antigravity.google/docs/cli/install/)
- [Heroku Container Registry](https://devcenter.heroku.com/articles/container-registry-and-runtime)
