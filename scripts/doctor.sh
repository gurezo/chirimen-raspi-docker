#!/usr/bin/env bash
#
# Pre-flight checks for chirimen-raspi-docker on Raspberry Pi host.
# Read-only diagnostics; sudo is not required.
# Hardware capability classification matches Server / Node Runtime
# (detectHardwareCapabilities / classifyHardwareCapabilities).
#
# Usage:
#   ./scripts/doctor.sh
#
set -euo pipefail

SYSFS_GPIO_PATH="/sys/class/gpio"
I2C_DEVICE="/dev/i2c-1"

ERROR_COUNT=0
WARN_COUNT=0
PI_MODEL=""
IS_RASPBERRY_PI=0

# Probe findings (paths)
SYSFS_GPIO=0
GPIOMEM_DEVICES=()
GPIOCHIP_DEVICES=()
I2C_DEV=0

# Classified backends (same names as HardwareCapabilities)
GPIO_BACKEND="unavailable"
I2C_BACKEND="unavailable"

log() {
  printf '%s\n' "$*"
}

err() {
  printf 'error: %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: doctor.sh

  Check Raspberry Pi host prerequisites for chirimen-raspi-docker:
    - Raspberry Pi model
    - architecture
    - Docker
    - Docker Compose
    - hardware capabilities (same criteria as Server startup):
        - /sys/class/gpio
        - /dev/gpiomem*
        - /dev/gpiochip*
        - /dev/i2c-1

  Missing items are reported as [error] or [warn].
  Exit 0 when no errors; exit 1 when one or more errors are found.

Examples:
  chmod +x scripts/doctor.sh
  ./scripts/doctor.sh
EOF
}

record_error() {
  ERROR_COUNT=$((ERROR_COUNT + 1))
}

record_warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
}

read_pi_model() {
  if [ -r /proc/device-tree/model ]; then
    PI_MODEL="$(tr -d '\0' </proc/device-tree/model)"
    return 0
  fi
  PI_MODEL=""
  return 1
}

is_raspberry_pi() {
  if read_pi_model; then
    case "$PI_MODEL" in
      *[Rr]aspberry\ [Pp]i*) return 0 ;;
    esac
  fi
  return 1
}

check_pi_model() {
  log "Checking Raspberry Pi model..."

  if is_raspberry_pi; then
    IS_RASPBERRY_PI=1
    log "[ok] Raspberry Pi model: $PI_MODEL"
    return 0
  fi

  if [ -n "$PI_MODEL" ]; then
    log "[error] not a Raspberry Pi (model: $PI_MODEL)"
  else
    log "[error] not a Raspberry Pi (/proc/device-tree/model unavailable)"
  fi
  record_error
}

check_architecture() {
  local arch
  arch="$(uname -m)"
  log "Checking architecture..."

  case "$arch" in
    aarch64 | armv7l)
      log "[ok] architecture: $arch"
      ;;
    *)
      log "[warn] unexpected architecture: $arch (expected aarch64 or armv7l on Raspberry Pi)"
      record_warn
      ;;
  esac
}

check_docker() {
  log "Checking Docker..."

  if ! command -v docker >/dev/null 2>&1; then
    log "[error] docker command not found"
    log "        install Docker: https://docs.docker.com/engine/install/"
    record_error
    return 0
  fi

  log "[ok] docker: $(docker --version 2>/dev/null || true)"

  if docker info >/dev/null 2>&1; then
    log "[ok] docker daemon is running"
    return 0
  fi

  log "[error] docker daemon is not reachable"
  if ! groups 2>/dev/null | tr ' ' '\n' | grep -qx docker; then
    log "        current user is not in the docker group"
    log "        try: sudo usermod -aG docker $USER && newgrp docker"
  else
    log "        try: sudo systemctl start docker"
  fi
  record_error
}

check_docker_compose() {
  log "Checking Docker Compose..."

  if docker compose version >/dev/null 2>&1; then
    log "[ok] docker compose: $(docker compose version --short 2>/dev/null || docker compose version 2>/dev/null | head -n1)"
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    log "[ok] docker-compose: $(docker-compose --version 2>/dev/null || true)"
    log "[warn] docker compose plugin not found; using legacy docker-compose"
    record_warn
    return 0
  fi

  log "[error] docker compose not found"
  log "        install Docker Compose plugin or docker-compose"
  record_error
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

classify_hardware_capabilities() {
  # GPIO priority: sysfs → gpiochip → unavailable (parent Issue #96)
  if [ "$SYSFS_GPIO" -eq 1 ]; then
    GPIO_BACKEND="sysfs"
  elif [ "${#GPIOCHIP_DEVICES[@]}" -gt 0 ]; then
    GPIO_BACKEND="gpiochip"
  else
    GPIO_BACKEND="unavailable"
  fi

  if [ "$I2C_DEV" -eq 1 ]; then
    I2C_BACKEND="i2c-dev"
  else
    I2C_BACKEND="unavailable"
  fi
}

list_path_details() {
  local path
  for path in "$@"; do
    if [ -e "$path" ]; then
      ls -l "$path"
    fi
  done
}

check_hardware_capabilities() {
  log "Checking hardware capabilities (Runtime-aligned)..."

  probe_hardware_paths
  classify_hardware_capabilities

  log "Probe findings:"
  if [ "$SYSFS_GPIO" -eq 1 ]; then
    log "[ok] $SYSFS_GPIO_PATH exists"
    list_path_details "$SYSFS_GPIO_PATH"
  else
    log "[warn] $SYSFS_GPIO_PATH not found"
  fi

  if [ "${#GPIOMEM_DEVICES[@]}" -gt 0 ]; then
    log "[ok] /dev/gpiomem* found (${#GPIOMEM_DEVICES[@]}):"
    list_path_details "${GPIOMEM_DEVICES[@]}"
  else
    log "[warn] no /dev/gpiomem* devices found"
  fi

  if [ "${#GPIOCHIP_DEVICES[@]}" -gt 0 ]; then
    log "[ok] /dev/gpiochip* found (${#GPIOCHIP_DEVICES[@]}):"
    list_path_details "${GPIOCHIP_DEVICES[@]}"
  else
    log "[warn] no /dev/gpiochip* devices found"
  fi

  case "$GPIO_BACKEND" in
    sysfs)
      log "[ok] gpio backend: sysfs"
      ;;
    gpiochip)
      log "[warn] gpio backend: gpiochip (unsupported; GPIO unavailable until backend is implemented)"
      log "        server startup will log: gpio backend gpiochip is unsupported"
      record_warn
      ;;
    unavailable)
      log "[warn] gpio backend: unavailable (no GPIO interface found)"
      if [ "$IS_RASPBERRY_PI" -eq 1 ]; then
        log "        verify /sys/class/gpio or /dev/gpiochip* on the host"
      fi
      record_warn
      ;;
  esac

  if [ "$I2C_BACKEND" = "i2c-dev" ]; then
    log "[ok] $I2C_DEVICE exists"
    list_path_details "$I2C_DEVICE"
    log "[ok] i2c backend: i2c-dev"
  else
    log "[error] $I2C_DEVICE not found"
    if [ "$IS_RASPBERRY_PI" -eq 1 ]; then
      log "        enable I2C on the host, then reboot:"
      log "          sudo ./scripts/enable-i2c.sh"
      log "          sudo reboot"
      log "          sudo ./scripts/enable-i2c.sh --check"
    else
      log "        (Raspberry Pi device node; expected on Pi host)"
    fi
    log "[error] i2c backend: unavailable"
    record_error
  fi

  # Same vocabulary as apps/server startup log
  log "[ capabilities ] gpio=${GPIO_BACKEND} i2c=${I2C_BACKEND}"
  if [ "$GPIO_BACKEND" = "gpiochip" ]; then
    log "[ runtime ] gpio backend gpiochip is unsupported; GPIO unavailable"
  fi
}

print_summary() {
  log ""
  if [ "$ERROR_COUNT" -eq 0 ]; then
    log "All checks passed."
    if [ "$WARN_COUNT" -gt 0 ]; then
      log "$WARN_COUNT warning(s) reported; review messages above before starting Docker Compose."
    fi
    log "You can start Docker Compose:"
    log "  docker compose up --build"
    return 0
  fi

  log "Some checks failed ($ERROR_COUNT error(s), $WARN_COUNT warning(s))."
  log "Fix the errors above before running docker compose up."
  return 1
}

main() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -h | --help)
        usage
        exit 0
        ;;
      *)
        err "unknown option: $1"
        usage >&2
        exit 1
        ;;
    esac
  done

  log "chirimen-raspi-docker doctor"
  log ""

  check_pi_model
  log ""
  check_architecture
  log ""
  check_docker
  log ""
  check_docker_compose
  log ""
  check_hardware_capabilities
  log ""

  print_summary
}

main "$@"
