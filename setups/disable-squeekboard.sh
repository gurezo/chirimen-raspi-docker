#!/usr/bin/env bash
#
# Disable the Raspberry Pi OS Desktop on-screen keyboard (Squeekboard).
# Intended for Raspberry Pi OS Desktop (Bookworm or later, Wayland).
# Disabling requires root (sudo). --check does not change settings and
# does not require sudo.
#
# Usage:
#   sudo ./setups/disable-squeekboard.sh       # Always Off (idempotent)
#   ./setups/disable-squeekboard.sh --check    # show current state
#
set -euo pipefail

SQUEEKBOARD_AUTOSTART="/etc/xdg/autostart/squeekboard.desktop"

log() {
  printf '%s\n' "$*"
}

err() {
  printf 'error: %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: disable-squeekboard.sh [--check]

  (default)  Set the Desktop on-screen keyboard (Squeekboard) to Always
             Off. Requires sudo. Raspberry Pi OS Desktop only.
  --check    Show the current state without changing settings (no sudo).

Examples:
  sudo ./setups/disable-squeekboard.sh
  ./setups/disable-squeekboard.sh --check
EOF
}

require_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    err "root privileges are required. Run with sudo."
    exit 1
  fi
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

# Raspberry Pi OS Bookworm reports ID=debian, so accept Pi OS markers
# (/etc/rpi-issue, raspi-config) in addition to ID=raspbian.
is_raspberry_pi_os() {
  [ -e /etc/rpi-issue ] && return 0
  raspi_config_available && return 0
  [ "$(os_release_id)" = "raspbian" ] && return 0
  return 1
}

require_raspberry_pi_os() {
  if ! is_raspberry_pi; then
    err "this script is intended for Raspberry Pi only."
    exit 1
  fi
  if ! is_raspberry_pi_os; then
    err "this script is intended for Raspberry Pi OS."
    exit 1
  fi
}

raspi_config_available() {
  command -v raspi-config >/dev/null 2>&1
}

raspi_config_path() {
  command -v raspi-config 2>/dev/null || true
}

do_squeekboard_available() {
  local rc_path
  rc_path="$(raspi_config_path)"
  [ -n "$rc_path" ] || return 1
  grep -q 'do_squeekboard' "$rc_path" 2>/dev/null
}

package_installed() {
  dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -q 'install ok installed'
}

# Desktop detection must work over SSH (no DISPLAY / WAYLAND_DISPLAY).
is_desktop() {
  package_installed raspberrypi-ui-mods && return 0
  package_installed squeekboard && return 0
  [ -e "$SQUEEKBOARD_AUTOSTART" ] && return 0
  return 1
}

# get_squeekboard prints 0 (Always On), 1 (Autodetect), or 2
# (Always Off or package not installed). Do not treat 2 as Always Off
# without Desktop / package context.
get_squeekboard_code() {
  if ! do_squeekboard_available; then
    return 1
  fi
  raspi-config nonint get_squeekboard 2>/dev/null
}

describe_squeekboard_code() {
  case "$1" in
    0) printf '%s\n' "Always On (S1)" ;;
    1) printf '%s\n' "Autodetect (S2)" ;;
    2) printf '%s\n' "Always Off or not installed (S3 / no autostart)" ;;
    *) printf '%s\n' "unknown" ;;
  esac
}

# S3 removes the autostart file; Always On / Autodetect recreate it.
is_always_off() {
  is_desktop || return 1
  [ ! -e "$SQUEEKBOARD_AUTOSTART" ]
}

show_squeekboard_state() {
  local code=""

  log "On-screen keyboard (Squeekboard) current state:"

  if raspi_config_available; then
    log "  raspi-config: found ($(raspi_config_path))"
  else
    log "  raspi-config: not found"
  fi

  if do_squeekboard_available; then
    log "  do_squeekboard: available"
  else
    log "  do_squeekboard: not available"
  fi

  if is_desktop; then
    log "  Desktop: yes"
  else
    log "  Desktop: no (Lite or unknown)"
  fi

  if package_installed squeekboard; then
    log "  squeekboard package: installed"
  else
    log "  squeekboard package: not installed"
  fi

  if [ -e "$SQUEEKBOARD_AUTOSTART" ]; then
    log "  autostart: $SQUEEKBOARD_AUTOSTART present"
  else
    log "  autostart: $SQUEEKBOARD_AUTOSTART missing"
  fi

  if code="$(get_squeekboard_code)"; then
    log "  get_squeekboard: ${code} ($(describe_squeekboard_code "$code"))"
  else
    log "  get_squeekboard: unavailable"
  fi
}

advise_relogin() {
  log ""
  log "On-screen keyboard is set to Always Off."
  log "raspi-config stops Squeekboard immediately. If it still appears, log out or reboot:"
  log "  sudo reboot"
  log ""
  log "Verify with:"
  log "  $0 --check"
}

skip_without_changes() {
  log "No configuration changes were made."
}

disable_squeekboard() {
  show_squeekboard_state
  log ""

  if ! do_squeekboard_available; then
    log "raspi-config nonint do_squeekboard is not available (Lite or older raspi-config)."
    skip_without_changes
    return 0
  fi

  if ! is_desktop; then
    log "Raspberry Pi OS Desktop was not detected. This script is for Desktop only."
    skip_without_changes
    return 0
  fi

  if is_always_off; then
    log "On-screen keyboard is already Always Off."
    skip_without_changes
    return 0
  fi

  log "setting on-screen keyboard to Always Off via raspi-config..."
  raspi-config nonint do_squeekboard S3
  log "raspi-config: on-screen keyboard Always Off (S3)."
  advise_relogin
}

check_squeekboard() {
  log "Checking on-screen keyboard on Raspberry Pi host..."
  log ""
  show_squeekboard_state
  log ""

  if ! do_squeekboard_available; then
    log "[info] do_squeekboard is not available. Nothing to configure."
    return 0
  fi

  if ! is_desktop; then
    log "[info] Raspberry Pi OS Desktop was not detected. Nothing to configure."
    return 0
  fi

  if is_always_off; then
    log "[ok] on-screen keyboard is Always Off"
    return 0
  fi

  log "[info] on-screen keyboard is not Always Off"
  log "Run without --check to set Always Off:"
  log "  sudo $0"
  return 0
}

main() {
  local mode="disable"

  while [ $# -gt 0 ]; do
    case "$1" in
      --check)
        mode="check"
        shift
        ;;
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

  require_raspberry_pi_os

  case "$mode" in
    check)
      check_squeekboard
      ;;
    disable)
      require_root
      disable_squeekboard
      ;;
  esac
}

main "$@"
