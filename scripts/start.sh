#!/usr/bin/env bash
#
# Capability-aware Docker Compose launcher for chirimen-raspi-docker.
# Probes host GPIO / I2C paths (same vocabulary as doctor.sh / Runtime)
# and maps only existing devices into the container. Does not use
# privileged mode.
#
# Usage:
#   ./scripts/start.sh
#   ./scripts/start.sh --build
#   ./scripts/start.sh -d
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SYSFS_GPIO_PATH="/sys/class/gpio"
I2C_DEVICE="/dev/i2c-1"

SYSFS_GPIO=0
GPIOMEM_DEVICES=()
GPIOCHIP_DEVICES=()
I2C_DEV=0

OVERRIDE_FILE=""

log() {
  printf '%s\n' "$*"
}

err() {
  printf 'error: %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: start.sh [docker compose up options...]

  Probe host hardware paths and start chirimen-server with only the
  devices that exist on this host (capability-aware mapping).

  Always uses:
    - compose.yaml (includes /sys/class/gpio volume)
    - no privileged: true

  Optionally maps when present:
    - /dev/gpiomem*
    - /dev/gpiochip*
    - /dev/i2c-1

  Extra arguments are passed to `docker compose up` (default: --build).
  If you pass any up options yourself, --build is not added automatically.

Examples:
  chmod +x scripts/start.sh
  ./scripts/start.sh
  ./scripts/start.sh -d
  ./scripts/start.sh --build --force-recreate

Same procedure on Raspberry Pi 3 / 4 / 5; no per-model compose edits.
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

write_devices_override() {
  local device

  OVERRIDE_FILE="$(mktemp "${TMPDIR:-/tmp}/chirimen-compose-devices.XXXXXX.yaml")"

  if [ "${#GPIOMEM_DEVICES[@]}" -eq 0 ] &&
    [ "${#GPIOCHIP_DEVICES[@]}" -eq 0 ] &&
    [ "$I2C_DEV" -eq 0 ]; then
    cat >"$OVERRIDE_FILE" <<'EOF'
# No optional host devices found; base compose.yaml mounts only.
services: {}
EOF
    return 0
  fi

  {
    printf '%s\n' 'services:'
    printf '%s\n' '  chirimen-server:'
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

  log "mapping: sysfs=${sysfs_status} gpiomem=${gpiomem_list} gpiochip=${gpiochip_list} i2c-1=${i2c_status}"
  log "privileged: false"
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

  while [ $# -gt 0 ]; do
    case "$1" in
      -h | --help)
        usage
        exit 0
        ;;
      *)
        break
        ;;
    esac
  done

  up_args=("$@")
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

  write_devices_override
  require_docker_compose

  log "starting: docker compose -f compose.yaml -f ${OVERRIDE_FILE} up ${up_args[*]}"
  log ""

  docker compose -f compose.yaml -f "$OVERRIDE_FILE" up "${up_args[@]}"
}

main "$@"
