# PPS Connect — Android App Build Guide

**App ID**: `com.prathvipower.ppsconnect`
**App Name**: PPS Connect
**Wrapper**: Capacitor 7 (loads https://prathvipowersolutions.com inside a native WebView)
**Package location**: `/app/frontend/android/`

The container this project is built in does not ship the Android SDK, so
the APK/AAB is generated on **your** machine. Everything else (icons, splash,
manifest, package id, network config) is pre-configured. You just build.

---

## One-time setup on your machine (Windows / Mac / Linux)

1. **Install Node.js** 20 LTS (already required by this project).
2. **Install Java Development Kit (JDK) 21** (or 17):
   - Windows / Mac: <https://adoptium.net/temurin/releases/>
   - After install run `java -version` → should print `21.x`
3. **Install Android Studio**: <https://developer.android.com/studio>
   - During setup, let the SDK Manager install:
     - **Android SDK Platform 34** (or newer)
     - **Android SDK Build-Tools 34.0.0**
     - **Android SDK Command-line Tools (latest)**
     - **Android Emulator** (only if you want to run without a real phone)
4. **Set environment variables** (Windows: System Properties → Env Vars):
   - `ANDROID_HOME` = `C:\Users\<you>\AppData\Local\Android\Sdk`
   - Add to `PATH`: `%ANDROID_HOME%\platform-tools`
   - Add to `PATH`: `%ANDROID_HOME%\cmdline-tools\latest\bin`

Sanity check:
```
adb --version
sdkmanager --version
```

---

## Building the APK (debug — for testing on your phone)

From the project root:

```bash
cd frontend
yarn install
yarn build                      # produces frontend/build/
npx cap sync android            # copies build/ into android/app/src/main/assets
cd android
./gradlew assembleDebug         # Mac/Linux
# or on Windows:  gradlew.bat assembleDebug
```

Output:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer this APK to any Android phone, tap to install (allow "Install unknown apps" once), and PPS Connect launches with the branded icon + splash. It shows the live site.

To install directly to a phone connected via USB (with USB debugging on):
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## Building the AAB (release — for Google Play Store)

### 1. Generate a signing key (do this ONCE, keep the keystore safe)
```bash
keytool -genkey -v -keystore pps-release.keystore -alias pps -keyalg RSA -keysize 2048 -validity 10000
```
Answer the prompts; remember the **keystore password** and **key alias password**.

### 2. Place the keystore + credentials
Copy `pps-release.keystore` into `/app/frontend/android/app/`.

Create `/app/frontend/android/key.properties` (**do not commit — add to .gitignore**):
```
storeFile=pps-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=pps
keyPassword=YOUR_KEY_PASSWORD
```

### 3. Enable release signing in `android/app/build.gradle`
Add near the top of the `android { }` block:
```groovy
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
    }
}
```

### 4. Build the AAB
```bash
cd frontend/android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab` — upload this to the Play Console.

---

## Regenerating icons or splash

Change `frontend/resources/icon.svg` or `frontend/resources/splash.svg`, then:
```bash
cd frontend
python3 resources/generate.py     # (pip install cairosvg first if missing)
npx cap sync android
```

---

## Updating the site content

The app loads `https://prathvipowersolutions.com` live — **you don't need to rebuild the APK when you change the website**. Users see the new UI instantly on next launch.

Only rebuild when you change:
- App id / name / icon / splash → `capacitor.config.json`, `resources/icon.svg`, `resources/splash.svg`
- Native plugins → `yarn add @capacitor/…`

---

## Which URL does the app load?

Configured in `/app/frontend/capacitor.config.json`:
```
"server": {
  "url": "https://prathvipowersolutions.com"
}
```

**Options:**
- Keep as-is → app is always up-to-date with the deployed site.
- Change to `"executive-board-3.preview.emergentagent.com"` → app hits the preview environment (useful for beta builds).
- Remove `server.url` entirely → app ships the **offline bundled** version (whatever was in `build/` at APK time). Good for offline demos, but requires rebuild on every site change.

---

## Permissions

Currently declared in `AndroidManifest.xml`: `INTERNET`, `ACCESS_NETWORK_STATE`.

If you later add features that need camera / storage / location, we'll wire up
the matching Capacitor plugins (`@capacitor/camera`, `@capacitor/filesystem`,
`@capacitor/geolocation`) and update `AndroidManifest.xml`.

---

## Common issues

| Symptom | Fix |
|---|---|
| `SDK location not found` on gradle build | Create `/app/frontend/android/local.properties` with `sdk.dir=/path/to/Android/Sdk` |
| Blank white screen on launch | Ensure `capacitor.config.json` `server.url` is HTTPS and the site is reachable |
| Google login popup gets stuck | Not applicable — we use JWT email/password only |
| "App not installed" on phone | Uninstall previous debug build first, or increment `versionCode` in `android/app/build.gradle` |
