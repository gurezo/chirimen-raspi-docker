# Browser Editor (code-server). linux/amd64 and linux/arm64 only.
# arm32 / armv7 is out of scope; see docs/architecture/browser-editor.md.
# Pin the semver tag. Do not use latest.
# This image is not a Hardware Runtime: do not add GPIO / I2C tools or devices.
FROM codercom/code-server:4.132.0

# Official image already runs as UID 1000 (coder) and ships git / curl / nano.
# Create the three mount points as coder so bind mounts and named volumes work.
USER root
RUN mkdir -p /home/coder/project /home/coder/.local /home/coder/.config \
  && chown -R coder:coder /home/coder/project /home/coder/.local /home/coder/.config

USER 1000
ENV USER=coder
WORKDIR /home/coder/project

# Separate source, extensions/user-data, and code-server config.
# Compose service is chirimen-editor (#175); persistence uid/gid is #176.
VOLUME ["/home/coder/project", "/home/coder/.local", "/home/coder/.config"]

EXPOSE 8080

# /healthz is unauthenticated. HTTP 200 means the process is up even when
# the JSON status is "expired" (no recent Browser session). Do not grep
# for "alive". curl is already in the official image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

# Keep the upstream entrypoint (fixuid / optional DOCKER_USER). Open the
# workspace directory instead of the default home folder.
ENTRYPOINT ["/usr/bin/entrypoint.sh", "--bind-addr", "0.0.0.0:8080", "/home/coder/project"]
