#!/usr/bin/env bash
#
# Capability-aware Docker Compose launcher for chirimen-raspi-docker.
# Probes host GPIO / I2C paths (same vocabulary as doctor.sh / Runtime)
# and maps only existing devices into the container. Does not use
# privileged mode.
#
# Usage:
#   ./scripts/start.sh
#   ./scripts/start.sh --32bit
#   ./scripts/start.sh --64bit
#   ./scripts/start.sh --build
#   ./scripts/start.sh -d
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SYSFS_GPIO_PATH="/sys/class/gpio"
I2C_DEVICE="/dev/i2c-1"

DOCKERFILE_64BIT="docker/server/Dockerfile"
DOCKERFILE_32BIT="docker/server/Dockerfile.32bit"
IMAGE_64BIT="chirimen-raspi-docker/server:phase1"
IMAGE_32BIT="chirimen-raspi-docker/server:phase1-32bit"

SYSFS_GPIO=0
GPIOMEM_DEVICES=()
GPIOCHIP_DEVICES=()
I2C_DEV=0

# 32 or 64. Empty until parsed / auto-detected.
OS_BITS=""
OS_BITS_SOURCE=""

OVERRIDE_FILE=""

log() {
  printf '%s\n' "$*"
}

err() {
  printf 'error: %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: start.sh [--32bit|--64bit|--arch 32|64] [docker compose up options...]

  Probe host hardware paths and start chirimen-server with only the
  devices that exist on this host (capability-aware mapping).
  On 64-bit, also starts chirimen-editor (code-server on 127.0.0.1:8080).
  Editor is skipped on 32-bit: the official image has no armv7 build.

  Always uses:
    - compose.yaml (includes /sys/class/gpio and /sys/devices volumes)
    - no privileged: true
    - Editor without GPIO / I2C devices (not a Hardware Runtime)

  Dockerfile (Node base image differs by OS bitness):
    --32bit          docker/server/Dockerfile.32bit (Node 22, linux/arm/v7)
    --64bit          docker/server/Dockerfile (Node 24)
    --arch 32|64     same as --32bit / --64bit
    (default)        auto-detect from uname -m

  Optionally maps when present (chirimen-server only):
    - /dev/gpiomem*
    - /dev/gpiochip*
    - /dev/i2c-1

  Extra arguments are passed to `docker compose up` (default: --build).
  If you pass any up options yourself, --build is not added automatically.

Examples:
  chmod +x scripts/start.sh
  ./scripts/start.sh
  ./scripts/start.sh --32bit
  ./scripts/start.sh --64bit -d
  ./scripts/start.sh --build --force-recreate

Same procedure on Raspberry Pi 3 / 4 / 5; no per-model compose edits.
EOF
}

cleanup() {
  if [ -n "${OVERRIDE_FILE}" ] && [ -f "${OVERRIDE_FILE}" ]; then
    rm -f "${OVERRIDE_FILE}"
  fi
}

set_os_bits() {
  local bits="$1"
  local source="$2"

  if [ -n "$OS_BITS" ] && [ "$OS_BITS" != "$bits" ]; then
    err "conflicting arch flags (already ${OS_BITS}-bit via ${OS_BITS_SOURCE})"
    exit 1
  fi

  OS_BITS="$bits"
  OS_BITS_SOURCE="$source"
}

parse_arch_value() {
  local value="$1"
  local source="$2"

  case "$value" in
    32 | 32bit | arm32 | armv7)
      set_os_bits 32 "$source"
      ;;
    64 | 64bit | arm64 | aarch64)
      set_os_bits 64 "$source"
      ;;
    *)
      err "invalid --arch value: ${value} (use 32 or 64)"
      exit 1
      ;;
  esac
}

detect_os_bits() {
  local machine
  machine="$(uname -m)"

  case "$machine" in
    armv6l | armv7l | armv8l | i386 | i686)
      set_os_bits 32 "uname -m (${machine})"
      ;;
    aarch64 | arm64 | x86_64 | amd64)
      set_os_bits 64 "uname -m (${machine})"
      ;;
    *)
      err "unknown machine '${machine}'; pass --32bit or --64bit"
      exit 1
      ;;
  esac
}

dockerfile_for_os_bits() {
  if [ "$OS_BITS" -eq 32 ]; then
    printf '%s\n' "$DOCKERFILE_32BIT"
  else
    printf '%s\n' "$DOCKERFILE_64BIT"
  fi
}

image_for_os_bits() {
  if [ "$OS_BITS" -eq 32 ]; then
    printf '%s\n' "$IMAGE_32BIT"
  else
    printf '%s\n' "$IMAGE_64BIT"
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

write_compose_override() {
  local dockerfile="$1"
  local image="$2"
  local device
  local editor_uid
  local editor_gid
  local editor_user

  OVERRIDE_FILE="$(mktemp "${TMPDIR:-/tmp}/chirimen-compose-devices.XXXXXX.yaml")"

  {
    printf '%s\n' 'services:'
    printf '%s\n' '  chirimen-server:'
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

    # Editor is 64-bit only. Pass host uid so bind-mounted examples are
    # writable (code-server fixuid). Do not add GPIO / I2C devices.
    if [ "$OS_BITS" -eq 64 ]; then
      editor_uid="$(id -u)"
      editor_gid="$(id -g)"
      editor_user="$(id -un)"
      printf '%s\n' '  chirimen-editor:'
      printf '%s\n' "    user: \"${editor_uid}:${editor_gid}\""
      printf '%s\n' '    environment:'
      printf '%s\n' "      DOCKER_USER: \"${editor_user}\""
    fi
  } >"$OVERRIDE_FILE"
}

log_mapping_summary() {
  local gpiomem_list="none"
  local gpiochip_list="none"
  local i2c_status="no"
  local sysfs_status="no"
  local dockerfile
  local image

  dockerfile="$(dockerfile_for_os_bits)"
  image="$(image_for_os_bits)"

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

  log "os: ${OS_BITS}-bit (${OS_BITS_SOURCE})"
  log "dockerfile: ${dockerfile}"
  log "image: ${image}"
  log "mapping: sysfs=${sysfs_status} gpiomem=${gpiomem_list} gpiochip=${gpiochip_list} i2c-1=${i2c_status}"
  log "privileged: false"
  if [ "$OS_BITS" -eq 32 ]; then
    log "editor: skipped (32-bit / armv7; see browser-editor.md)"
  else
    log "editor: chirimen-editor uid=$(id -u):$(id -g) user=$(id -un) (no GPIO/I2C devices)"
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

main() {
  local -a up_args=()
  local dockerfile
  local image

  while [ $# -gt 0 ]; do
    case "$1" in
      -h | --help)
        usage
        exit 0
        ;;
      --32bit)
        set_os_bits 32 "--32bit"
        shift
        ;;
      --64bit)
        set_os_bits 64 "--64bit"
        shift
        ;;
      --arch)
        if [ $# -lt 2 ]; then
          err "--arch requires 32 or 64"
          exit 1
        fi
        parse_arch_value "$2" "--arch ${2}"
        shift 2
        ;;
      --arch=*)
        parse_arch_value "${1#--arch=}" "$1"
        shift
        ;;
      *)
        up_args+=("$1")
        shift
        ;;
    esac
  done

  if [ -z "$OS_BITS" ]; then
    detect_os_bits
  fi

  dockerfile="$(dockerfile_for_os_bits)"
  image="$(image_for_os_bits)"

  if [ ! -f "${REPO_ROOT}/${dockerfile}" ]; then
    err "Dockerfile not found: ${dockerfile}"
    exit 1
  fi

  if [ "${#up_args[@]}" -eq 0 ]; then
    up_args=(--build)
  fi

  trap cleanup EXIT

  cd "$REPO_ROOT"

  log "chirimen-raspi-docker start (capability-aware)"
  log ""

  probe_hardware_paths
  log_mapping_summary
  log ""

  if [ "$SYSFS_GPIO" -eq 0 ]; then
    log "warn: ${SYSFS_GPIO_PATH} not found on host; GPIO sysfs backend will be unavailable in the container"
  fi
  if [ "$I2C_DEV" -eq 0 ]; then
    log "warn: ${I2C_DEVICE} not found on host; I2C will be unavailable (enable with scripts/enable-i2c.sh on Pi)"
  fi

  write_compose_override "$dockerfile" "$image"
  require_docker_compose

  local -a compose_services=()
  if [ "$OS_BITS" -eq 32 ]; then
    compose_services=(chirimen-server)
  fi

  if [ "${#compose_services[@]}" -gt 0 ]; then
    log "starting: docker compose -f compose.yaml -f ${OVERRIDE_FILE} up ${up_args[*]} ${compose_services[*]}"
    log ""
    docker compose -f compose.yaml -f "$OVERRIDE_FILE" up "${up_args[@]}" "${compose_services[@]}"
  else
    log "starting: docker compose -f compose.yaml -f ${OVERRIDE_FILE} up ${up_args[*]}"
    log ""
    docker compose -f compose.yaml -f "$OVERRIDE_FILE" up "${up_args[@]}"
  fi
}

main "$@"
