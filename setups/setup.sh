#!/usr/bin/env bash
#
# Beginner Host setup orchestration for chirimen-raspi-docker.
# Checks Runtime-required Host state and calls existing setups/*.sh
# only when needed. Verifies workspace/ and runs doctor.sh as
# Runtime readiness. Does not run swap.sh, Docker build, or start.sh
# (those are Development-only on Pi 4 / Pi 5; Pi 3 B+ stays Runtime-only).
# Raspberry Pi OS 32-bit userland is Unsupported (exit 1); use 64-bit Desktop.
#
# Usage:
#   ./setups/setup.sh
#
# Related:
#   docs/guides/setup-host-script-audit.md
#   Issues #326 (parent), #328 (orchestration), #329 (I2C / reboot),
#   #330 (workspace / Runtime readiness), #331 (Development-only separation)
#
set -euo pipefail

I2C_DEVICE="/dev/i2c-1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ENABLE_I2C_SH="${SCRIPT_DIR}/enable-i2c.sh"
DISABLE_SQUEEKBOARD_SH="${SCRIPT_DIR}/disable-squeekboard.sh"
DOCKER_SH="${SCRIPT_DIR}/docker.sh"
DOCKER_COMPOSE_SH="${SCRIPT_DIR}/docker-compose.sh"
DOCTOR_SH="${REPO_ROOT}/scripts/doctor.sh"

log() {
  printf '%s\n' "$*"
}

err() {
  printf 'error: %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: setup.sh

  Beginner Host setup for CHIRIMEN Runtime on Raspberry Pi OS.
  Runs only the Host setup steps that are still needed, then checks
  workspace/ and Runtime readiness via doctor.sh.

  Raspberry Pi OS 32-bit userland is Unsupported and stops immediately.
  Supported environment: Raspberry Pi OS 64-bit Desktop.
  See docs/architecture/compatibility.md and
  docs/architecture/compatibility-32bit.md.

  Does not run swap.sh, Docker build, or start.sh.
  swap.sh and Docker build are Development-only (Pi 4 / Pi 5).
  Does not trigger image build on Pi 3 B+ (Runtime-only).
  Does not require Node.js / npm / pnpm / Nx on the Host.

Examples:
  ./setups/setup.sh
EOF
}

is_raspberry_pi() {
  if [ -r /proc/device-tree/model ]; then
    grep -qi 'raspberry pi' /proc/device-tree/model 2>/dev/null
    return $?
  fi
  return 1
}

os_release_id() {
  awk -F= '/^ID=/{ gsub(/"/, "", $2); print $2; exit }' /etc/os-release 2>/dev/null || true
}

raspi_config_available() {
  command -v raspi-config >/dev/null 2>&1
}

# Raspberry Pi OS Bookworm reports ID=debian, so accept Pi OS markers
# (/etc/rpi-issue, raspi-config) in addition to ID=raspbian.
is_raspberry_pi_os() {
  [ -e /etc/rpi-issue ] && return 0
  raspi_config_available && return 0
  [ "$(os_release_id)" = "raspbian" ] && return 0
  return 1
}

# Userland bitness via getconf LONG_BIT (not uname -m alone).
# Pi 4 / Pi 5 32-bit OS can report aarch64 with a 64-bit kernel.
userland_bits() {
  getconf LONG_BIT 2>/dev/null || true
}

is_unsupported_32bit_userland() {
  local bits arch
  bits="$(userland_bits)"
  arch="$(uname -m)"

  if [ "$bits" = "32" ]; then
    return 0
  fi

  case "$arch" in
    armv7l | armhf | i686 | i386)
      return 0
      ;;
  esac

  return 1
}

print_unsupported_32bit_message() {
  err "Unsupported environment detected."
  err ""
  err "Raspberry Pi OS 32-bit is not supported."
  err ""
  err "Supported environment:"
  err "  Raspberry Pi OS 64-bit Desktop"
  err ""
  err "See:"
  err "  docs/architecture/compatibility.md"
  err "  docs/architecture/compatibility-32bit.md"
}

require_environment() {
  if ! is_raspberry_pi; then
    err "this script is intended for Raspberry Pi only."
    exit 1
  fi
  if ! is_raspberry_pi_os; then
    err "this script is intended for Raspberry Pi OS."
    exit 1
  fi
  if is_unsupported_32bit_userland; then
    print_unsupported_32bit_message
    exit 1
  fi
  log "Environment check: Raspberry Pi OS OK"
}

require_script() {
  local path="$1"
  if [ ! -f "$path" ]; then
    err "required script not found: ${path}"
    exit 1
  fi
  if [ ! -x "$path" ]; then
    err "required script is not executable: ${path}"
    exit 1
  fi
}

i2c_device_exists() {
  [ -e "$I2C_DEVICE" ]
}

docker_installed() {
  command -v docker >/dev/null 2>&1
}

compose_plugin_available() {
  docker compose version >/dev/null 2>&1
}

print_success() {
  cat <<'EOF'

Setup completed.

Start CHIRIMEN:
  docker compose up -d

Then open:
  http://localhost:4200
EOF
}

print_reboot_and_rerun() {
  local reason="$1"
  log ""
  log "${reason}"
  log "Reboot is required:"
  log "  sudo reboot"
  log ""
  log "After reboot, run again:"
  log "  ./setups/setup.sh"
  exit 0
}

print_failure_hint() {
  local reason="$1"
  err "${reason}"
  err "Fix the issue above, then re-run:"
  err "  ./setups/setup.sh"
}

run_enable_i2c_if_needed() {
  log ""
  log "==> Host hardware: I2C"

  if i2c_device_exists; then
    log "I2C enabled: ${I2C_DEVICE} present (skip enable-i2c.sh)"
    return 0
  fi

  require_script "${ENABLE_I2C_SH}"
  log "I2C device missing; running enable-i2c.sh"
  # Pass CHIRIMEN_BEGINNER_SETUP so enable-i2c.sh leaves next-step
  # guidance to this orchestrator (re-run setup.sh, not --check).
  if ! sudo CHIRIMEN_BEGINNER_SETUP=1 "${ENABLE_I2C_SH}"; then
    print_failure_hint "enable-i2c.sh failed."
    exit 1
  fi

  if i2c_device_exists; then
    log "I2C device is available after enable (no reboot required)."
    return 0
  fi

  print_reboot_and_rerun \
    "I2C was enabled or is configured, but ${I2C_DEVICE} is not available yet."
}

run_disable_squeekboard() {
  log ""
  log "==> Host hardware: Squeekboard"

  require_script "${DISABLE_SQUEEKBOARD_SH}"
  log "Running disable-squeekboard.sh (Lite is a no-op)"
  if ! sudo "${DISABLE_SQUEEKBOARD_SH}"; then
    print_failure_hint "disable-squeekboard.sh failed."
    exit 1
  fi
}

run_docker_if_needed() {
  log ""
  log "==> Docker"

  if docker_installed; then
    log "Docker installed (skip docker.sh)"
    return 0
  fi

  require_script "${DOCKER_SH}"
  log "Docker not found; running docker.sh"
  log "Note: docker.sh reboots the Host when it finishes."
  log "After reboot, run again:"
  log "  ./setups/setup.sh"
  # docker.sh ends with sudo reboot; if reboot is delayed, fall through.
  "${DOCKER_SH}"
  print_reboot_and_rerun \
    "docker.sh finished. Reboot if the Host did not restart automatically."
}

run_docker_compose_if_needed() {
  log ""
  log "==> Docker Compose"

  if ! docker_installed; then
    print_failure_hint "Docker is required before Compose setup."
    exit 1
  fi

  if compose_plugin_available; then
    log "Docker Compose plugin available (skip docker-compose.sh)"
    return 0
  fi

  require_script "${DOCKER_COMPOSE_SH}"
  log "Compose plugin missing; running docker-compose.sh"
  if ! "${DOCKER_COMPOSE_SH}"; then
    print_failure_hint "docker-compose.sh failed."
    exit 1
  fi

  if compose_plugin_available; then
    log "Docker Compose plugin is now available."
    return 0
  fi

  # Standalone docker-compose may still satisfy older docs; prefer plugin.
  if command -v docker-compose >/dev/null 2>&1; then
    log "standalone docker-compose is installed."
    log "Prefer 'docker compose' when available after reboot or package update."
    return 0
  fi

  print_failure_hint \
    "Neither 'docker compose' nor 'docker-compose' is available."
  exit 1
}

check_workspace() {
  local workspace_dir="${REPO_ROOT}/workspace"
  local owner mode

  log ""
  log "==> workspace"

  if [ ! -d "${workspace_dir}" ]; then
    print_failure_hint \
      "workspace/ is missing. Re-clone the repository so workspace/ is present."
    exit 1
  fi

  if [ ! -w "${workspace_dir}" ]; then
    owner="$(stat -c '%U:%G' "${workspace_dir}" 2>/dev/null \
      || stat -f '%Su:%Sg' "${workspace_dir}" 2>/dev/null \
      || printf 'unknown')"
    mode="$(stat -c '%a' "${workspace_dir}" 2>/dev/null \
      || stat -f '%Lp' "${workspace_dir}" 2>/dev/null \
      || printf 'unknown')"
    err "workspace/ is not writable by the current user ($(id -un))."
    err "  path: ${workspace_dir}"
    err "  owner: ${owner}"
    err "  mode: ${mode}"
    print_failure_hint \
      "Make workspace/ editable by your user, then re-run."
    exit 1
  fi

  log "workspace/ is available and writable by $(id -un)."
}

run_runtime_readiness() {
  log ""
  log "==> Runtime readiness (doctor.sh)"

  require_script "${DOCTOR_SH}"
  # Pass CHIRIMEN_BEGINNER_SETUP so doctor leaves next-step guidance
  # to this orchestrator (docker compose up -d, not start.sh).
  if ! CHIRIMEN_BEGINNER_SETUP=1 "${DOCTOR_SH}"; then
    print_failure_hint "doctor.sh reported Runtime readiness errors."
    exit 1
  fi
}

verify_i2c_after_resume() {
  if ! i2c_device_exists; then
    return 0
  fi
  require_script "${ENABLE_I2C_SH}"
  if ! "${ENABLE_I2C_SH}" --check; then
    print_failure_hint "enable-i2c.sh --check failed."
    exit 1
  fi
}

main() {
  if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
  fi
  if [ "$#" -gt 0 ]; then
    err "unexpected argument: $1"
    usage >&2
    exit 1
  fi

  cd "${REPO_ROOT}"

  log "CHIRIMEN beginner Host setup"
  log "Repository: ${REPO_ROOT}"
  log ""

  require_environment

  # If I2C is already present (e.g. after reboot), confirm with --check.
  if i2c_device_exists; then
    verify_i2c_after_resume
  fi

  run_enable_i2c_if_needed
  run_disable_squeekboard
  run_docker_if_needed
  run_docker_compose_if_needed
  check_workspace
  run_runtime_readiness

  print_success
}

main "$@"
