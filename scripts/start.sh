#!/usr/bin/env bash
#
# Capability-aware Docker Compose launcher for chirimen-raspi-docker.
# Probes host GPIO / I2C paths (same vocabulary as doctor.sh / Runtime)
# and maps only existing devices into the container. Does not use
# privileged mode.
#
# Usage:
#   ./scripts/start.sh
#   ./scripts/start.sh --lan
#   ./scripts/start.sh --build
#   ./scripts/start.sh --no-build
#   ./scripts/start.sh -d
##
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SYSFS_GPIO_PATH="/sys/class/gpio"
I2C_DEVICE="/dev/i2c-1"

DOCKERFILE="docker/server/Dockerfile"
IMAGE="chirimen-raspi-docker/server:phase1"

SYSFS_GPIO=0
GPIOMEM_DEVICES=()
GPIOCHIP_DEVICES=()
I2C_DEV=0

# 1 when --lan is passed. Publishes Editor / Example Server /
# Example Catalog on 0.0.0.0 (does not change Runtime 33330).
WANT_LAN=0

# 1 when --no-build is passed. Skips the default auto --build.
# Use on Raspberry Pi 3 B+ (Runtime-only); on-device Docker build
# is Unsupported there. Pi 4 / Pi 5 may use the default --build.
WANT_NO_BUILD=0

OVERRIDE_FILE=""

log() {
  printf '%s\n' "$*"
}

err() {
  printf 'error: %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: start.sh [--lan] [--no-build] [docker compose up options...]

  Probe host hardware paths and start services with only the devices
  that exist on this host (capability-aware mapping).
  Starts chirimen-runtime, chirimen-editor (code-server on
  127.0.0.1:8080, password auth), chirimen-example-server
  (http://127.0.0.1:4173/), chirimen-example-catalog
  (http://127.0.0.1:4200/), and chirimen-gateway
  (http://127.0.0.1/catalog → :4200, and /editor /example /runtime).
  On an interactive TTY, the first start prompts for an Editor
  password and writes it to gitignored .env. Non-interactive runs
  (CI / no TTY / already set) skip the prompt. Unset then generates
  a password into the editor config volume. auth: none is not used.

  Always uses:
    - compose.yaml (includes /sys/class/gpio and /sys/devices volumes)
    - no privileged: true
    - Editor, Example Server, Example Catalog, and Gateway without GPIO / I2C
      devices (not a Hardware Runtime)
    - Editor / Gateway host bind 127.0.0.1 unless --lan (does not publish to the Internet)
    - docker/server/Dockerfile (Node 24, 64-bit)

  Optional:
    --lan            publish Editor 8080 / Example Server 4173 / Catalog 4200 /
                     Gateway 80 on 0.0.0.0 (LAN). Does not change Runtime
                     33330. Password auth stays required. Do not use this
                     to publish on the Internet.
    --no-build       do not pass --build to `docker compose up`.
                     Use on Raspberry Pi 3 B+ (Runtime-only).
                     On-device Docker build is Unsupported on Pi 3 B+.
                     Pi 4 / Pi 5: omit this flag (default adds --build).

  Removed (error if passed):
    --editor         Editor / Example Server / Catalog now start by default
    --64bit          64-bit is the only supported path
    --32bit          32-bit Runtime path is removed; use 64-bit OS
    --arch 32|64     64-bit is the only supported path

  Optionally maps when present (chirimen-runtime only):
    - /dev/gpiomem*
    - /dev/gpiochip*
    - /dev/i2c-1

  Extra arguments are passed to `docker compose up` (default: --build).
  If you pass --no-build, or any up options yourself, --build is not
  added automatically.

Examples:
  chmod +x scripts/start.sh
  ./scripts/start.sh
  ./scripts/start.sh --lan
  ./scripts/start.sh --no-build
  ./scripts/start.sh --lan --no-build
  ./scripts/start.sh --build --force-recreate

Runtime start is the same on Raspberry Pi 3 / 4 / 5 (no per-model
compose edits). Default auto --build is for Pi 4 / Pi 5. On Pi 3 B+
(Runtime-only) use --no-build. See docs/guides/getting-started.md.
EOF
}

cleanup() {
  if [ -n "${OVERRIDE_FILE}" ] && [ -f "${OVERRIDE_FILE}" ]; then
    rm -f "${OVERRIDE_FILE}"
  fi
}

collect_dev_entries_matching() {
  # Prints matching /dev/<prefix>* paths, one per line (empty if none).
  local prefix="$1"
  local name
  if [ ! -d /dev ]; then
    return 0
  fi
  for name in /dev/"${prefix}"*; do
    if [ -e "$name" ]; then
      printf '%s\n' "$name"
    fi
  done
}

probe_hardware_paths() {
  local device

  SYSFS_GPIO=0
  GPIOMEM_DEVICES=()
  GPIOCHIP_DEVICES=()
  I2C_DEV=0

  if [ -e "$SYSFS_GPIO_PATH" ]; then
    SYSFS_GPIO=1
  fi

  while IFS= read -r device; do
    [ -n "$device" ] || continue
    GPIOMEM_DEVICES+=("$device")
  done < <(collect_dev_entries_matching "gpiomem")

  while IFS= read -r device; do
    [ -n "$device" ] || continue
    GPIOCHIP_DEVICES+=("$device")
  done < <(collect_dev_entries_matching "gpiochip")

  if [ -e "$I2C_DEVICE" ]; then
    I2C_DEV=1
  fi
}

# Load repo-root .env into the process environment when present.
# Compose also reads .env for interpolation; this lets start.sh see
# CHIRIMEN_EDITOR_PASSWORD without requiring the caller to export it.
load_repo_env() {
  local env_file="${REPO_ROOT}/.env"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
  fi
}

editor_auth_is_set() {
  [ -n "${CHIRIMEN_EDITOR_PASSWORD:-}" ] || [ -n "${CHIRIMEN_EDITOR_HASHED_PASSWORD:-}" ]
}

is_interactive_setup() {
  [ -t 0 ] && [ -t 1 ] && [ -z "${CI:-}" ]
}

# Quote a value for a POSIX .env assignment that load_repo_env sources.
# Single quotes; a literal ' becomes '\'' (end quote, escaped quote, reopen).
env_single_quote() {
  local value="$1"
  local result="'"
  local i
  local c
  local len="${#value}"

  for ((i = 0; i < len; i++)); do
    c="${value:i:1}"
    if [ "$c" = "'" ]; then
      result+="'\\''"
    else
      result+="$c"
    fi
  done
  result+="'"
  printf '%s' "$result"
}

# Write CHIRIMEN_EDITOR_PASSWORD into gitignored .env without printing it.
# Copy .env.example when .env is missing. chmod 600. Do not commit .env.
upsert_editor_password_env() {
  local password="$1"
  local env_file="${REPO_ROOT}/.env"
  local example_file="${REPO_ROOT}/.env.example"
  local quoted
  local tmp
  local line
  local found=0

  quoted="$(env_single_quote "$password")"

  if [ ! -f "$env_file" ]; then
    if [ -f "$example_file" ]; then
      cp "$example_file" "$env_file"
    else
      printf '%s\n' '# Created by scripts/start.sh (#269). Do not commit.' >"$env_file"
    fi
  fi

  tmp="$(mktemp "${TMPDIR:-/tmp}/chirimen-env.XXXXXX")"
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" =~ ^[[:space:]]*CHIRIMEN_EDITOR_PASSWORD= ]]; then
      printf 'CHIRIMEN_EDITOR_PASSWORD=%s\n' "$quoted"
      found=1
    else
      printf '%s\n' "$line"
    fi
  done <"$env_file" >"$tmp"

  if [ "$found" -eq 0 ]; then
    printf 'CHIRIMEN_EDITOR_PASSWORD=%s\n' "$quoted" >>"$tmp"
  fi

  mv "$tmp" "$env_file"
  chmod 600 "$env_file"
}

# Interactive first-start: rememberable password into .env (#269).
# Skip when already set, or non-interactive (CI / no TTY).
# Never prints the password. auth: none is not offered.
ensure_editor_password() {
  local password
  local confirm

  if editor_auth_is_set; then
    return 0
  fi
  if ! is_interactive_setup; then
    return 0
  fi

  log "Browser Editor password is not set."
  log "Choose a password you can remember. It is written to .env (gitignored)."
  log "The value is not printed. Open :8080 with this password."
  log ""

  while true; do
    printf 'Password: '
    IFS= read -r -s password || true
    printf '\n'
    if [ -z "$password" ]; then
      err "password must not be empty"
      continue
    fi
    printf 'Confirm password: '
    IFS= read -r -s confirm || true
    printf '\n'
    if [ "$password" != "$confirm" ]; then
      err "passwords do not match"
      continue
    fi
    break
  done

  upsert_editor_password_env "$password"
  unset password confirm
  load_repo_env
}

# Quote a value for a Compose YAML double-quoted string. $ becomes $$
# so Compose interpolation does not eat password / argon2 hashes.
compose_yaml_string() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//\$/\$\$}"
  printf '"%s"' "$value"
}

write_compose_override() {
  local dockerfile="$1"
  local image="$2"
  local device
  local editor_uid
  local editor_gid
  local editor_user
  local editor_password
  local editor_hashed

  OVERRIDE_FILE="$(mktemp "${TMPDIR:-/tmp}/chirimen-compose-devices.XXXXXX.yaml")"

  {
    printf '%s\n' 'services:'
    printf '%s\n' '  chirimen-runtime:'
    printf '%s\n' "    image: ${image}"
    printf '%s\n' '    build:'
    printf '%s\n' '      context: .'
    printf '%s\n' "      dockerfile: ${dockerfile}"

    if [ "${#GPIOMEM_DEVICES[@]}" -gt 0 ] ||
      [ "${#GPIOCHIP_DEVICES[@]}" -gt 0 ] ||
      [ "$I2C_DEV" -eq 1 ]; then
      printf '%s\n' '    devices:'
      for device in "${GPIOMEM_DEVICES[@]}"; do
        printf '      - %s:%s\n' "$device" "$device"
      done
      for device in "${GPIOCHIP_DEVICES[@]}"; do
        printf '      - %s:%s\n' "$device" "$device"
      done
      if [ "$I2C_DEV" -eq 1 ]; then
        printf '      - %s:%s\n' "$I2C_DEVICE" "$I2C_DEVICE"
      fi
    fi

    # Editor + Example Server + Example Catalog start by default.
    # Pass host uid so bind-mounted examples are writable (code-server
    # fixuid). Do not add GPIO / I2C devices to Editor / Example Server /
    # Catalog. Inject password env only when non-empty (empty PASSWORD=
    # can break auth).
    editor_uid="$(id -u)"
    editor_gid="$(id -g)"
    editor_user="$(id -un)"
    editor_password="${CHIRIMEN_EDITOR_PASSWORD:-}"
    editor_hashed="${CHIRIMEN_EDITOR_HASHED_PASSWORD:-}"
    printf '%s\n' '  chirimen-editor:'
    printf '%s\n' "    user: \"${editor_uid}:${editor_gid}\""
    printf '%s\n' '    environment:'
    printf '%s\n' "      DOCKER_USER: \"${editor_user}\""
    if [ -n "$editor_password" ]; then
      printf '      PASSWORD: %s\n' "$(compose_yaml_string "$editor_password")"
    fi
    if [ -n "$editor_hashed" ]; then
      printf '      HASHED_PASSWORD: %s\n' "$(compose_yaml_string "$editor_hashed")"
    fi
  } >"$OVERRIDE_FILE"
}

log_mapping_summary() {
  local gpiomem_list="none"
  local gpiochip_list="none"
  local i2c_status="no"
  local sysfs_status="no"

  if [ "$SYSFS_GPIO" -eq 1 ]; then
    sysfs_status="yes"
  fi

  if [ "${#GPIOMEM_DEVICES[@]}" -gt 0 ]; then
    gpiomem_list="$(IFS=','; echo "${GPIOMEM_DEVICES[*]}")"
  fi

  if [ "${#GPIOCHIP_DEVICES[@]}" -gt 0 ]; then
    gpiochip_list="$(IFS=','; echo "${GPIOCHIP_DEVICES[*]}")"
  fi

  if [ "$I2C_DEV" -eq 1 ]; then
    i2c_status="yes"
  fi

  log "dockerfile: ${DOCKERFILE}"
  log "image: ${IMAGE}"
  log "mapping: sysfs=${sysfs_status} gpiomem=${gpiomem_list} gpiochip=${gpiochip_list} i2c-1=${i2c_status}"
  log "privileged: false"
  log "editor: chirimen-editor uid=$(id -u):$(id -g) user=$(id -un) (no GPIO/I2C devices)"
  if editor_auth_is_set; then
    log "auth: password is set in .env (value not shown)"
  else
    log "auth: password will be generated into the editor config volume"
  fi
  if [ "$WANT_LAN" -eq 1 ]; then
    log "publish: 0.0.0.0 (LAN) 80/8080/4173/4200"
    log "example-server: http://0.0.0.0:4173/ (no GPIO/I2C devices)"
    log "example-catalog: http://0.0.0.0:4200/ (no GPIO/I2C devices)"
    log "gateway: http://0.0.0.0/catalog → :4200 (name redirects, no TLS)"
  else
    log "publish: ${CHIRIMEN_PUBLISH_BIND:-127.0.0.1} 80/8080/4173/4200"
    log "example-server: http://127.0.0.1:4173/ (no GPIO/I2C devices)"
    log "example-catalog: http://127.0.0.1:4200/ (no GPIO/I2C devices)"
    log "gateway: http://127.0.0.1/catalog → :4200 (name redirects, no TLS)"
  fi
}

require_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    return 0
  fi

  err "docker compose not found"
  err "install Docker Compose plugin, then retry"
  exit 1
}

removed_flag_error() {
  local flag="$1"
  case "$flag" in
    --editor)
      err "--editor is removed; Editor / Example Server / Catalog start by default"
      err "use: ./scripts/start.sh"
      err "LAN: ./scripts/start.sh --lan"
      ;;
    --64bit)
      err "--64bit is removed; 64-bit is the only supported path"
      err "use: ./scripts/start.sh"
      ;;
    --32bit)
      err "--32bit is removed; 32-bit Runtime path is unsupported"
      err "use Raspberry Pi OS 64-bit and: ./scripts/start.sh"
      err "historical notes: docs/architecture/compatibility-32bit.md"
      ;;
    --arch)
      err "--arch is removed; 64-bit is the only supported path"
      err "use: ./scripts/start.sh"
      ;;
  esac
  exit 1
}

main() {
  local -a up_args=()

  while [ $# -gt 0 ]; do
    case "$1" in
      -h | --help)
        usage
        exit 0
        ;;
      --32bit)
        removed_flag_error "--32bit"
        ;;
      --64bit)
        removed_flag_error "--64bit"
        ;;
      --arch | --arch=*)
        removed_flag_error "--arch"
        ;;
      --editor)
        removed_flag_error "--editor"
        ;;
      --lan)
        WANT_LAN=1
        shift
        ;;
      --no-build)
        WANT_NO_BUILD=1
        shift
        ;;
      *)
        up_args+=("$1")
        shift
        ;;
    esac
  done

  if [ ! -f "${REPO_ROOT}/${DOCKERFILE}" ]; then
    err "Dockerfile not found: ${DOCKERFILE}"
    exit 1
  fi

  if [ "$WANT_NO_BUILD" -eq 1 ]; then
    # Pass Compose --no-build so a cold cache does not auto-build
    # missing images (required for Pi 3 B+ Runtime-only).
    if [ "${#up_args[@]}" -eq 0 ]; then
      up_args=(--no-build)
    else
      up_args=(--no-build "${up_args[@]}")
    fi
  elif [ "${#up_args[@]}" -eq 0 ]; then
    up_args=(--build)
  fi

  trap cleanup EXIT

  cd "$REPO_ROOT"

  load_repo_env
  ensure_editor_password
  if [ "$WANT_LAN" -eq 1 ]; then
    export CHIRIMEN_PUBLISH_BIND=0.0.0.0
  fi

  log "chirimen-raspi-docker start (capability-aware)"
  log ""

  probe_hardware_paths
  log_mapping_summary
  log ""

  if [ "$SYSFS_GPIO" -eq 0 ]; then
    log "warn: ${SYSFS_GPIO_PATH} not found on host; GPIO sysfs backend will be unavailable in the container"
  fi
  if [ "$I2C_DEV" -eq 0 ]; then
    log "warn: ${I2C_DEVICE} not found on host; I2C will be unavailable (enable with setups/enable-i2c.sh on Pi)"
  fi

  write_compose_override "$DOCKERFILE" "$IMAGE"
  require_docker_compose

  local -a compose_cmd=(docker compose -f compose.yaml -f "$OVERRIDE_FILE" up)

  log "starting: ${compose_cmd[*]} ${up_args[*]}"
  log ""
  "${compose_cmd[@]}" "${up_args[@]}"
}

main "$@"
