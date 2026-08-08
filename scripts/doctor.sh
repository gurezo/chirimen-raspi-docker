#!/usr/bin/env bash
#
# Pre-flight checks for chirimen-raspi-docker on Raspberry Pi host.
# Read-only diagnostics; sudo is not required.
#
# Usage:
#   ./scripts/doctor.sh
#
set -euo pipefail

GPIO_DEVICE="/dev/gpiomem"
I2C_DEVICE="/dev/i2c-1"

ERROR_COUNT=0
WARN_COUNT=0
PI_MODEL=""
IS_RASPBERRY_PI=0
IS_PI5=0

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
    - /dev/gpiomem
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

detect_pi_generation() {
  IS_PI5=0
  case "$PI_MODEL" in
    *"Raspberry Pi 5"*) IS_PI5=1 ;;
  esac
}

check_pi_model() {
  log "Checking Raspberry Pi model..."

  if is_raspberry_pi; then
    IS_RASPBERRY_PI=1
    detect_pi_generation
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

list_gpiochip_devices() {
  local device
  local found=0
  for device in /dev/gpiochip*; do
    if [ -e "$device" ]; then
      ls -l "$device"
      found=1
    fi
  done
  if [ "$found" -eq 0 ]; then
    log "        no /dev/gpiochip* devices found"
  fi
}

check_gpiomem() {
  log "Checking $GPIO_DEVICE..."

  if [ -e "$GPIO_DEVICE" ]; then
    log "[ok] $GPIO_DEVICE exists"
    ls -l "$GPIO_DEVICE"
    return 0
  fi

  if [ "$IS_RASPBERRY_PI" -eq 0 ]; then
    log "[error] $GPIO_DEVICE not found (Raspberry Pi device node)"
    record_error
    return 0
  fi

  if [ "$IS_PI5" -eq 1 ]; then
    log "[warn] $GPIO_DEVICE not found on Raspberry Pi 5"
    log "        Pi 5 may use /dev/gpiochip* instead:"
    list_gpiochip_devices
    log "        add required devices to compose.yaml devices if needed"
    record_warn
    return 0
  fi

  log "[error] $GPIO_DEVICE not found"
  log "        verify GPIO is available on the host"
  record_error
}

check_i2c_device() {
  log "Checking $I2C_DEVICE..."

  if [ -e "$I2C_DEVICE" ]; then
    log "[ok] $I2C_DEVICE exists"
    ls -l "$I2C_DEVICE"
    return 0
  fi

  if [ "$IS_RASPBERRY_PI" -eq 0 ]; then
    log "[error] $I2C_DEVICE not found (Raspberry Pi device node)"
    record_error
    return 0
  fi

  log "[error] $I2C_DEVICE not found"
  log "        enable I2C on the host, then reboot:"
  log "          sudo ./scripts/enable-i2c.sh"
  log "          sudo reboot"
  log "          sudo ./scripts/enable-i2c.sh --check"
  record_error
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
  check_gpiomem
  log ""
  check_i2c_device
  log ""

  print_summary
}

main "$@"
