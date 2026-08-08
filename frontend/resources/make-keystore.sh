#!/bin/bash
# Interactive helper — generates a Play Store release keystore for PPS Connect.
# Run this ONCE on your local machine (not the server) and keep the .keystore SAFE.
# Losing this file means you cannot ship updates to the same Play listing ever again.

set -e
cd "$(dirname "$0")/../android/app"

KEYSTORE="pps-release.keystore"
ALIAS="pps"

if [ -f "$KEYSTORE" ]; then
  echo "⚠️  A keystore already exists at $(pwd)/$KEYSTORE"
  echo "   Delete it manually if you want to regenerate (this will orphan the Play listing!)."
  exit 1
fi

echo "==============================================================="
echo " Generating release keystore for PPS Connect"
echo " Location: $(pwd)/$KEYSTORE"
echo " Alias:    $ALIAS"
echo " Validity: 10000 days (~27 years)"
echo "==============================================================="
echo
echo "You'll be asked for:"
echo "  1. A keystore password (min 6 chars)"
echo "  2. A key password (can be the same as keystore password)"
echo "  3. Some identity fields — recommended values below:"
echo "       Name:            Harivansh Raj"
echo "       Org unit:        Engineering"
echo "       Organisation:    Prathvi Power Solutions"
echo "       City:            Sitapur"
echo "       State:           Uttar Pradesh"
echo "       Country code:    IN"
echo

keytool -genkey -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000

echo
echo "✅  Keystore created: $(pwd)/$KEYSTORE"
echo

read -sp "Re-enter the keystore password so I can write key.properties: " STORE_PW
echo
read -sp "Re-enter the key alias password (same as above unless you set differently): " KEY_PW
echo

cat > ../key.properties <<EOF
storeFile=app/${KEYSTORE}
storePassword=${STORE_PW}
keyAlias=${ALIAS}
keyPassword=${KEY_PW}
EOF

echo "✅  Wrote $(cd ..; pwd)/key.properties (never commit this file!)"
echo
echo "Both files are already listed in .gitignore."
echo
echo "Next: cd .. && ./gradlew bundleRelease"
echo "     Output → android/app/build/outputs/bundle/release/app-release.aab"
