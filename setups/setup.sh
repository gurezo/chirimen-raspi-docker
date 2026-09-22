#!/usr/bin/env bash
#
# Beginner Host setup orchestration for chirimen-raspi-docker.
# Checks Runtime-required Host state and calls existing setups/*.sh
# only when needed. Does not run swap.sh, Docker build, or start.sh.
#
# Usage:
#   ./setups/setup.sh
#
# Related:
#   docs/guides/setup-host-script-audit.md
#   Issues #326 (parent), #328 (this script)
#
set -euo pipefail

I2C_DEVICE="/dev/i2c-1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

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
  Runs only the Host setup steps that are still needed.

  Does not run swap.sh, Docker build, or start.sh.
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

require_environment() {
  if ! is_raspberry_pi; then
    err "this script is intended for Raspberry Pi only."
    exit 1
  fi
  if ! is_raspberry_pi_os; then
    err "this script is intended for Raspberry Pi OS."
    exit 1
  fi
  log "Environment check: Raspberry Pi OS OK"
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

  # Host hardware / Docker / Compose orchestration is wired in a follow-up
  # commit for #328. Skeleton ends with success messaging for the happy path
  # once later steps are complete.
  log ""
  log "Note: Host hardware and Docker steps are not wired yet in this skeleton."
  print_success
}

main "$@"
