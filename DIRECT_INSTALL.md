# PPS Connect — Direct Install on Your Phone (no Play Store)

Two ways to get the APK onto your Android phone. Pick one:

- **Path A — GitHub Actions (recommended, zero installs on your laptop)** ⭐
- **Path B — Build locally with Android Studio** *(same steps as the Play Store guide, minus the upload)*

---

## Path A — GitHub Actions (easiest)

You do **nothing** on your laptop beyond pushing the repo to GitHub. Google's servers build the APK, you download the file with your phone browser, tap to install. Total time: **~10 minutes**.

### Prerequisites
- A GitHub account (free)
- The Emergent workspace pushed to a GitHub repo (use the **Save to GitHub** button in the Emergent chat input)

### Step 1 — Confirm the workflow is in the repo
File: `.github/workflows/android-build.yml` (already created in this project).

### Step 2 — Trigger a build
1. Open your repo on GitHub → **Actions** tab.
2. On the left, click **Android APK**.
3. Top-right: **Run workflow** → keep default `build_type = debug` → **Run workflow**.
4. Wait ~7 minutes. When the green ✓ appears:
   - Click the run.
   - Scroll to **Artifacts** at the bottom.
   - Download **`pps-connect-debug-apk`** (a `.zip` containing `app-debug.apk`).

The workflow also runs automatically every time you push to `main`.

### Step 3 — Get the APK onto your phone
Two options:

- **WhatsApp/Telegram to yourself** — fastest. Send the `.apk` file from your laptop's WhatsApp Web to your own number, open on the phone, tap the file.
- **Direct download** — upload the APK to Google Drive → open the Drive app on your phone → download → open.

### Step 4 — Install
On your phone, tap the APK file. Android will show:

> "For your security, your phone isn't allowed to install unknown apps from this source."

Tap **Settings** → toggle **Allow from this source** (this is per-app, e.g. WhatsApp or Drive) → back → **Install**. Done.

The **PPS Connect** icon appears in your app drawer. Launch it — splash screen → live app.

### Step 5 — (Optional) Signed release APK
The debug APK is fine for personal use, but if you want to share the APK with team members or hand it out over WhatsApp, a **signed release APK** is the professional path (smaller, faster, no "debug" warning):

1. Generate a keystore ONCE (**see `PLAY_STORE_PUBLISH.md` §3** for the interactive helper).
2. Encode the keystore for GitHub:
   ```bash
   base64 pps-release.keystore > keystore.txt
   ```
3. In your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → add four secrets:
   - `RELEASE_KEYSTORE_BASE64` — paste the contents of `keystore.txt`
   - `RELEASE_STORE_PASSWORD` — your keystore password
   - `RELEASE_KEY_ALIAS` — `pps`
   - `RELEASE_KEY_PASSWORD` — your key password
4. Go to Actions → Run workflow → pick **release** → Run.
5. Download `pps-connect-release-apk` artifact.

Now you can share this APK freely. Users can install without any "unknown source" scariness once it's on their phone.

---

## Path B — Build locally on your laptop

Use this if you don't want to use GitHub, or you need offline / air-gapped builds.

Follow the full **Prerequisites** section in [`ANDROID_BUILD.md`](./ANDROID_BUILD.md) (JDK 21 + Android Studio + env vars), then:

```bash
cd frontend
yarn install
yarn build:android          # builds + syncs Capacitor
cd android
./gradlew assembleDebug     # or assembleRelease for signed APK
```

Output:
- Debug: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `frontend/android/app/build/outputs/apk/release/app-release.apk`

### Install directly via USB (fastest for testing)
1. Enable **Developer Options** on your phone: Settings → About phone → tap **Build number** 7 times.
2. In Developer Options, turn on **USB debugging**.
3. Plug the phone into your laptop via USB → allow the prompt.
4. From your laptop:
   ```bash
   cd frontend/android
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```

Every subsequent build just needs `adb install -r <path>` — the phone updates in seconds.

### Install without a cable
- Copy the `.apk` to Google Drive / OneDrive / WhatsApp → download & install on the phone.

---

## Which APK for whom?

| Use case | APK to build | Notes |
|---|---|---|
| Trying it yourself for the first time | Debug | Zero setup — no keystore needed |
| Sharing with 1–2 trusted teammates | Debug | Works, but they'll see an "installed from unknown source" warning |
| Sharing with all Prathvi Power Solutions staff | Release | Requires keystore. Cleaner install experience. |
| Publishing to Google Play | AAB (see `PLAY_STORE_PUBLISH.md`) | Enables the polished Play Store distribution + auto-updates |

---

## Auto-updates when you sideload

**Sideloaded APKs do NOT auto-update from Play Store.** Two ways to handle new versions:

1. **The zero-effort trick**: the app currently loads `https://prathvipowersolutions.com` inside a WebView. That means **web changes ship instantly to every installed app** without an APK rebuild. You only need a new APK when you change:
   - App icon / splash / native config
   - Native permissions (camera, storage, etc.)
   - Capacitor plugins
2. **When you do rebuild**, share the new APK the same way (WhatsApp / Drive). Users tap the new file → Android shows "Update PPS Connect" → tap Install. **Important**: bump `versionCode` in `frontend/android/app/build.gradle` (integer, must always go up: 1 → 2 → 3 …) or Android will refuse the update.

---

## Common gotchas

| Symptom | Fix |
|---|---|
| "App not installed" on tap | You already have a version with a different signature. Uninstall it first, then install. This happens if you switch between debug and release APKs. |
| "For your security, your phone…" popup | Normal for sideload — tap Settings → toggle "Allow from this source" for the app you downloaded from (WhatsApp / Chrome / Drive). |
| Actions run fails on `assembleRelease` with "keystore.file does not exist" | You picked `release` in the workflow but the four `RELEASE_*` secrets aren't set in GitHub yet. Add them or run `debug` instead. |
| Build takes 15+ minutes | First run only (SDK download). Subsequent runs cache and finish in 3–5 min. |
| GitHub says "no runners" | You're on a free GitHub account — free minutes reset monthly and are plenty for a personal project. No action needed. |

---

## FAQ

**Q — Is the debug APK safe to run on my daily phone?**
Yes. Debug just means it was signed with the default Android debug key. All the code, security and functionality are identical to a release APK.

**Q — Will Google Play scan sideloaded APKs?**
Yes — Play Protect scans every installed app. You'll see a one-time "This app hasn't been reviewed by Google Play" notice; tap **Install anyway**. This is safe because you built the app yourself.

**Q — Can I bypass the "unknown source" warning?**
Only by publishing to Play Store (or by signing the APK and installing it from Play Store as an internal test) — see `PLAY_STORE_PUBLISH.md`.

**Q — What if I don't want to use GitHub at all?**
Follow Path B. You'll install Android Studio (~5 GB), the JDK (~200 MB), and run `./gradlew assembleDebug`. That's the traditional way.

---

You're set. When ready, click **Save to GitHub** in the Emergent chat input, then jump to **Path A → Step 2**.
