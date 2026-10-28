# Heroku SSH dependency setup

Sycord Cloud's password-based SSH connections require **openssh-client** (`ssh`) and **sshpass** on the **Heroku dyno**, not on your phone or the remote VM.

The repository now includes an `Aptfile`:

```text
openssh-client
sshpass
```

## Required one-time Heroku setup (classic Node.js buildpack)

Heroku does **not** install `Aptfile` packages automatically with the Node.js buildpack alone. Add the Heroku apt buildpack **before** the Node.js buildpack, then rebuild:

```sh
heroku buildpacks:add --index 1 https://github.com/heroku/heroku-buildpack-apt -a YOUR_HEROKU_APP
heroku buildpacks -a YOUR_HEROKU_APP
git push heroku main
```

If you deploy through GitHub integration instead of `git push heroku main`, trigger **Deploy Branch** in the Heroku dashboard after changing the buildpack. Do not remove the existing Node.js buildpack.

In the Heroku dashboard, you can do the same under **Settings → Buildpacks → Add buildpack**, using `https://github.com/heroku/heroku-buildpack-apt`, and moving it above Node.js.

## Verify

```sh
heroku run 'command -v ssh && command -v sshpass && ssh -V && sshpass -V' -a YOUR_HEROKU_APP
```

The `sshpass -V` command prints its version; no password is needed for this check.

## Docker deployments

The repository's Dockerfile already installs both packages. If your Heroku app uses the **container** stack, the `Aptfile` buildpack does not apply. Rebuild and redeploy the Docker image instead.

## Troubleshooting

If the UI still says `ssh`/`sshpass` is missing after redeploy, inspect the Heroku build log for the apt buildpack and run the verification command above. A successful install only fixes the missing-executable error; firewall rules, root SSH authentication, and VM reachability are separate checks.
