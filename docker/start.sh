#!/bin/sh
set -eu

# Enforce a single MPM (prefork) in the runtime Apache config.
rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.*

for f in /etc/apache2/mods-enabled/mpm_*; do
    [ -e "$f" ] || [ -L "$f" ] || continue
    case "$(basename "$f")" in
        mpm_prefork.*) ;;
        *) rm -f "$f" ;;
    esac
done

for f in /etc/apache2/conf-enabled/mpm_* /etc/apache2/sites-enabled/mpm_*; do
    [ -e "$f" ] || [ -L "$f" ] || continue
    rm -f "$f"
done

# Log runtime state so the cause is visible in deploy logs if the error persists.
echo "=== /etc/apache2/mods-enabled and conf-enabled ==="
ls -l /etc/apache2/mods-enabled /etc/apache2/conf-enabled || true
echo "=== apache2ctl -M ==="
apache2ctl -M || true

# Storage setup.
mkdir -p "$INDICA_STORAGE_DIR" && chown -R www-data:www-data "$INDICA_STORAGE_DIR"

exec apache2-foreground
