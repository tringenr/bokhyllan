#!/bin/sh
# Sätter samma nya versionsnummer på alla ställen som styr uppdateringen:
# ?v= i index.html, const DV i js/app.js, MY i index.html och data/version.json.
# Kör före varje commit som ändrar css/js/data:  sh test/versionsstampla.sh
set -e
cd "$(dirname "$0")/.."
V=$(TZ=Europe/Stockholm date +%Y%m%d%H%M%S)
sed -i.bak -E "s/\?v=[0-9]{14}/?v=$V/g; s/var MY=\"[0-9]+\"/var MY=\"$V\"/" index.html
sed -i.bak -E "s/const DV=\"\?v=[0-9]{14}\"/const DV=\"?v=$V\"/" js/app.js
printf '{"v": "%s"}\n' "$V" > data/version.json
rm -f index.html.bak js/app.js.bak
echo "Version $V"
