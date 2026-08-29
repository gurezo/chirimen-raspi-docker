#!/usr/bin/env bash
#
# Ensure a swap file on Raspberry Pi host (useful before Docker builds
# on 1GB models such as Pi 3 B+). Idempotent. Requires root (sudo).
#
# Usage:
#   sudo ./setups/swap.sh              # create/enable 4G /swapfile
#   sudo ./setups/swap.sh --size 4G    # same (default)
#   sudo ./setups/swap.sh --check      # verify swap is active
#
set -euo pipefail

SWAP_FILE="/swapfile"
SWAP_SIZE="4G"
WANT_CHECK=0

log() {
  printf '%s\n' "$*"
}

err() {
  printf 'error: %s\n' "$*" >&2
}

usage() {
  cat <<'EOF'
Usage: swap.sh [--size SIZE] [--check]

  (default)  Create /swapfile (default 4G), enable it, and persist in
             /etc/fstab. Safe to re-run when already configured.
  --size     Swap file size for fallocate / dd (e.g. 4G, 2048M).
  --check    Verify that swap is active (no changes).

Run before Docker image builds on low-memory hosts:

  sudo ./setups/swap.sh
  free -h
  ./scripts/start.sh

Examples:
  sudo ./setups/swap.sh
  sudo ./setups/swap.sh --size 4G
  sudo ./setups/swap.sh --check
EOF
}

require_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    err "root privileges are required. Run with sudo."
    exit 1
  fi
}

# Convert SIZE like 4G / 2048M / 4GiB to bytes (integer). Best-effort.
size_to_bytes() {
  local raw="$1"
  local num unit
  if [[ "$raw" =~ ^([0-9]+)([KkMmGg]i?[Bb]?)?$ ]]; then
    num="${BASH_REMATCH[1]}"
    unit="${BASH_REMATCH[2]:-}"
  else
    err "invalid --size value: ${raw} (use e.g. 4G or 2048M)"
    exit 1
  fi
  case "$unit" in
    "" | [Bb])
      printf '%s\n' "$num"
      ;;
    [Kk] | [Kk][Bb] | [Kk]i[Bb])
      printf '%s\n' "$((num * 1024))"
      ;;
    [Mm] | [Mm][Bb] | [Mm]i[Bb])
      printf '%s\n' "$((num * 1024 * 1024))"
      ;;
    [Gg] | [Gg][Bb] | [Gg]i[Bb])
      printf '%s\n' "$((num * 1024 * 1024 * 1024))"
      ;;
    *)
      err "invalid --size unit in: ${raw}"
      exit 1
      ;;
  esac
}

swap_is_active_for_file() {
  swapon --show=NAME --noheadings 2>/dev/null | grep -qx "$SWAP_FILE"
}

show_status() {
  log "--- swapon --show ---"
  swapon --show || true
  log "--- free -h ---"
  free -h
}

check_only() {
  if ! swap_is_active_for_file; then
    err "${SWAP_FILE} is not active as swap"
    show_status
    exit 1
  fi
  log "[ok] ${SWAP_FILE} is active"
  show_status
}

ensure_fstab() {
  local entry="${SWAP_FILE} none swap sw 0 0"
  if grep -Eq "^[[:space:]]*${SWAP_FILE}([[:space:]]|$)" /etc/fstab 2>/dev/null; then
    log "fstab: ${SWAP_FILE} already listed"
    return 0
  fi
  log "fstab: appending ${entry}"
  printf '%s\n' "$entry" >>/etc/fstab
}

create_swapfile() {
  local size_bytes="$1"

  if [ -e "$SWAP_FILE" ]; then
    if swap_is_active_for_file; then
      log "swapoff ${SWAP_FILE} before recreate"
      swapoff "$SWAP_FILE"
    fi
    log "removing existing ${SWAP_FILE}"
    rm -f "$SWAP_FILE"
  fi

  log "creating ${SWAP_FILE} (${SWAP_SIZE})"
  if ! fallocate -l "$SWAP_SIZE" "$SWAP_FILE" 2>/dev/null; then
    log "fallocate failed; falling back to dd"
    local count_mb=$((size_bytes / 1024 / 1024))
    if [ "$count_mb" -lt 1 ]; then
      err "size too small after conversion"
      exit 1
    fi
    dd if=/dev/zero of="$SWAP_FILE" bs=1M count="$count_mb" status=progress
  fi

  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
}

size_matches() {
  local have_bytes="$1"
  local want_bytes="$2"
  local lower upper

  lower=$((want_bytes - 1048576))
  upper=$((want_bytes + 1048576))
  if [ "$lower" -lt 0 ]; then
    lower=0
  fi
  [ "$have_bytes" -ge "$lower" ] && [ "$have_bytes" -le "$upper" ]
}

ensure_swap() {
  local want_bytes
  local have_bytes

  want_bytes="$(size_to_bytes "$SWAP_SIZE")"

  if [ -f "$SWAP_FILE" ]; then
    have_bytes="$(stat -c '%s' "$SWAP_FILE" 2>/dev/null || stat -f '%z' "$SWAP_FILE")"
    if size_matches "$have_bytes" "$want_bytes"; then
      if swap_is_active_for_file; then
        log "[ok] ${SWAP_FILE} already active at ~${SWAP_SIZE}"
      else
        log "swapon existing ${SWAP_FILE}"
        swapon "$SWAP_FILE"
        log "[ok] swap enabled"
      fi
      ensure_fstab
      show_status
      return 0
    fi
    log "existing ${SWAP_FILE} size differs; recreating for ${SWAP_SIZE}"
  fi

  create_swapfile "$want_bytes"
  log "swapon ${SWAP_FILE}"
  swapon "$SWAP_FILE"
  ensure_fstab
  log "[ok] swap enabled"
  show_status
}

main() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -h | --help)
        usage
        exit 0
        ;;
      --check)
        WANT_CHECK=1
        shift
        ;;
      --size)
        if [ $# -lt 2 ]; then
          err "--size requires a value (e.g. 4G)"
          exit 1
        fi
        SWAP_SIZE="$2"
        shift 2
        ;;
      --size=*)
        SWAP_SIZE="${1#--size=}"
        shift
        ;;
      *)
        err "unknown argument: $1"
        usage
        exit 1
        ;;
    esac
  done

  # Validate size early (also for --check we only need root + status).
  size_to_bytes "$SWAP_SIZE" >/dev/null

  require_root

  if [ "$WANT_CHECK" -eq 1 ]; then
    check_only
    exit 0
  fi

  ensure_swap
}

main "$@"
