#!/usr/bin/env bash
#
# Enable I2C on Raspberry Pi host for chirimen-raspi-docker.
# Requires root (sudo). Reboot is required after enabling I2C.
#
# Usage:
#   sudo ./scripts/enable-i2c.sh          # enable I2C (idempotent)
#   sudo ./scripts/enable-i2c.sh --check  # verify /dev/i2c-1 after reboot
#
set -euo pipefail

I2C_DEVICE="/dev/i2c-1"
I2C_DTPARAM="dtparam=i2c_arm=on"

log() {
  printf '%s\n' "$*"
}

err() {
  printf 'error: %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: enable-i2c.sh [--check]

  (default)  Enable I2C on Raspberry Pi host (requires sudo).
  --check    Verify that /dev/i2c-1 is available after reboot.

Examples:
  sudo ./scripts/enable-i2c.sh
  sudo reboot
  sudo ./scripts/enable-i2c.sh --check
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

find_boot_config() {
  local candidate
  for candidate in /boot/firmware/config.txt /boot/config.txt; do
    if [ -f "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

config_has_i2c_enabled() {
  local config_file="$1"
  grep -Eq '^[[:space:]]*dtparam=i2c(_arm)?=on' "$config_file" 2>/dev/null
}

raspi_config_available() {
  command -v raspi-config >/dev/null 2>&1
}

raspi_config_i2c_enabled() {
  if ! raspi_config_available; then
    return 1
  fi
  raspi-config nonint get_i2c >/dev/null 2>&1
}

i2c_device_exists() {
  [ -e "$I2C_DEVICE" ]
}

i2c_fully_enabled() {
  i2c_device_exists && { ! raspi_config_available || raspi_config_i2c_enabled; }
}

ensure_config_dtparam() {
  local config_file
  config_file="$(find_boot_config)" || {
    err "boot config not found (/boot/firmware/config.txt or /boot/config.txt)."
    return 1
  }

  if config_has_i2c_enabled "$config_file"; then
    log "config already contains I2C dtparam: $config_file"
    return 0
  fi

  printf '\n# Enable I2C (chirimen-raspi-docker enable-i2c.sh)\n%s\n' "$I2C_DTPARAM" >>"$config_file"
  log "added '$I2C_DTPARAM' to $config_file"
  return 2
}

enable_i2c() {
  local changed=0
  local config_file=""

  if i2c_fully_enabled; then
    log "I2C is already enabled ($I2C_DEVICE is available)."
    return 0
  fi

  if raspi_config_available; then
    if raspi_config_i2c_enabled; then
      log "raspi-config reports I2C is enabled, but $I2C_DEVICE is missing."
      log "A reboot may be required."
    else
      log "enabling I2C via raspi-config..."
      raspi-config nonint do_i2c 0
      changed=1
      log "raspi-config: I2C enabled."
    fi
  else
    log "raspi-config not found; updating boot config directly."
  fi

  config_file="$(find_boot_config)" || {
    err "boot config not found (/boot/firmware/config.txt or /boot/config.txt)."
    return 1
  }

  if ! config_has_i2c_enabled "$config_file"; then
    local config_status=0
    ensure_config_dtparam || config_status=$?
    if [ "$config_status" -eq 2 ]; then
      changed=1
    elif [ "$config_status" -ne 0 ]; then
      return 1
    fi
  fi

  if i2c_device_exists; then
    log "I2C is enabled and $I2C_DEVICE is available."
    return 0
  fi

  if [ "$changed" -eq 1 ]; then
    log ""
    log "I2C settings were updated. Reboot is required:"
    log "  sudo reboot"
    log ""
    log "After reboot, verify with:"
    log "  sudo $0 --check"
    log "  ls -l $I2C_DEVICE"
    return 0
  fi

  err "I2C could not be enabled automatically."
  err "Enable manually: sudo raspi-config -> Interface Options -> I2C -> Enable"
  return 1
}

check_i2c() {
  local ok=0

  log "Checking I2C on Raspberry Pi host..."
  log ""

  if i2c_device_exists; then
    log "[ok] $I2C_DEVICE exists"
    ls -l "$I2C_DEVICE"
  else
    log "[fail] $I2C_DEVICE not found"
    ok=1
  fi

  if getent group i2c >/dev/null 2>&1; then
    log "[ok] i2c group: $(getent group i2c)"
  else
    log "[warn] i2c group not found (may appear after reboot)"
    ok=1
  fi

  if raspi_config_available; then
    if raspi_config_i2c_enabled; then
      log "[ok] raspi-config: I2C enabled"
    else
      log "[fail] raspi-config: I2C disabled"
      ok=1
    fi
  fi

  local config_file
  if config_file="$(find_boot_config)" && config_has_i2c_enabled "$config_file"; then
    log "[ok] boot config contains I2C dtparam ($config_file)"
  elif config_file="$(find_boot_config)"; then
    log "[warn] boot config has no I2C dtparam ($config_file)"
  fi

  log ""
  if [ "$ok" -eq 0 ]; then
    log "I2C is ready. You can start with capability-aware mapping:"
    log "  ./scripts/start.sh"
    return 0
  fi

  err "I2C is not ready. Run without --check to enable, then reboot."
  return 1
}

main() {
  local mode="enable"

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

  require_root

  if ! is_raspberry_pi; then
    err "this script is intended for Raspberry Pi only."
    exit 1
  fi

  case "$mode" in
    check) check_i2c ;;
    enable) enable_i2c ;;
  esac
}

main "$@"
