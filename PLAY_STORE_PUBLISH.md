# PPS Connect — Google Play Store Publishing Runbook

Everything code-side is already prepared for a signed release. What remains
is **your side** — a Google Play Developer account, one signing keystore
generated on your laptop, and the Play Console listing. Follow this in order.
Total time: ~90 minutes the first time, ~10 min for each future release.

---

## Table of contents
1. What's already done in the codebase
2. Prerequisites (~30 min, one-time)
3. Generate signing keystore (~5 min, ONCE — keep it safe!)
4. Build the signed AAB (~5 min)
5. Create the Play Console listing (~45 min, one-time)
6. Upload the AAB & submit for review (~5 min)
7. Future releases (~10 min each)

---

## 1. What's already done in the codebase

- ✅ Capacitor 7 Android project at `/app/frontend/android/`
- ✅ App id `com.prathvipower.ppsconnect`, name **PPS Connect**, version `1.0.0` (versionCode 1)
- ✅ Branded launcher icon + adaptive icon at all mipmap sizes
- ✅ Splash screen at all portrait + landscape drawables
- ✅ Release signing config wired in `android/app/build.gradle` — reads from `key.properties`
- ✅ ProGuard/R8 minification enabled with rules that keep Capacitor plugins working
- ✅ Manifest permissions: `INTERNET`, `ACCESS_NETWORK_STATE` only (Data Safety form will be simple)
- ✅ Hardware back-button + native status bar + splash-screen plugin
- ✅ Offline banner (`OfflineBanner.jsx`) shows when network drops
- ✅ Play Store assets generated: `frontend/resources/play-store/`
  - `icon-512.png` — hi-res store icon
  - `feature-1024x500.png` — Play Store feature graphic
  - `01-dashboard.png` … `05-admin.png` — 5 phone screenshots
- ✅ Public privacy policy at `https://prathvipowersolutions.com/privacy`

---

## 2. Prerequisites (~30 min, one-time)

On the machine that will build the AAB (Windows / Mac / Linux):

1. **Node.js 20 LTS** — already installed for the project.
2. **JDK 21** (or 17) — [Temurin](https://adoptium.net/temurin/releases/). Verify: `java -version`
3. **Android Studio** — [download](https://developer.android.com/studio). During setup let the SDK Manager install:
   - Android SDK Platform 34 (or newer)
   - Android SDK Build-Tools 34.0.0
   - Command-line Tools (latest)
4. **Env vars** (Windows: System Properties → Advanced → Env Variables):
   - `ANDROID_HOME` = `C:\Users\<you>\AppData\Local\Android\Sdk`
   - Add to `PATH`: `%ANDROID_HOME%\platform-tools`
   - Add to `PATH`: `%ANDROID_HOME%\cmdline-tools\latest\bin`
5. **Google Play Developer account** — [sign up](https://play.google.com/console/signup) ($25 one-time). Use your business email (`harivanshraj9@gmail.com` if this is a personal account, or a workspace email for the org). Approval usually takes minutes.
6. **A hosted privacy policy URL** — done. Confirm `https://prathvipowersolutions.com/privacy` loads in a browser.

Sanity check on your machine:
```bash
java -version         # 21.x
adb --version         # 34.x or newer
sdkmanager --version  # 12.x
```

---

## 3. Generate signing keystore (ONCE — critical!)

**This keystore is your identity on Google Play. Lose it and you can never update the app again.** Back it up to a password manager and an encrypted drive.

```bash
cd /path/to/pps-connect/frontend/resources
bash make-keystore.sh
```

The script:
- Runs `keytool` and asks for passwords + identity (recommended values printed on screen)
- Creates `frontend/android/app/pps-release.keystore`
- Creates `frontend/android/key.properties` with your passwords (already git-ignored)

**Immediately after:** copy `pps-release.keystore` to at least two secure backup locations. Save the passwords in your password manager (LastPass / 1Password / Bitwarden).

If `make-keystore.sh` is unavailable, run manually:
```bash
cd frontend/android/app
keytool -genkey -v -keystore pps-release.keystore -alias pps -keyalg RSA -keysize 2048 -validity 10000
```
Then create `frontend/android/key.properties`:
```
storeFile=app/pps-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=pps
keyPassword=YOUR_KEY_PASSWORD
```

---

## 4. Build the signed AAB (~5 min)

From the project root:
```bash
cd frontend
yarn install                    # if node_modules stale
yarn build                      # produces frontend/build/
npx cap sync android            # syncs to android/app/src/main/assets/public
cd android
./gradlew bundleRelease         # Mac/Linux
# or:  gradlew.bat bundleRelease    (Windows)
```

Output:
```
frontend/android/app/build/outputs/bundle/release/app-release.aab
```

Verify signing:
```bash
jarsigner -verify -verbose -certs app-release.aab | head
# should print "jar verified"
```

**Bonus** — build a debug APK for direct-install testing on a phone:
```bash
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Create the Play Console listing (~45 min, one-time)

Open [Play Console](https://play.google.com/console) → **Create app**.

### 5.1 App details
| Field | Value |
|---|---|
| App name | **PPS Connect** |
| Default language | English (India) — `en-IN` |
| App or game | App |
| Free or paid | Free |
| Declarations | Tick both (Play policies + US export laws) |

### 5.2 Main store listing → Store presence → Main store listing
| Field | Value |
|---|---|
| App name | PPS Connect |
| Short description (80 chars) | Prathvi Power Solutions — expenses, HRMS, billing & DISCOM in your pocket. |
| Full description | *(see block below — paste as-is)* |
| App icon (512×512) | Upload `frontend/resources/play-store/icon-512.png` |
| Feature graphic (1024×500) | Upload `frontend/resources/play-store/feature-1024x500.png` |
| Phone screenshots (min 2, upload all 5) | Upload `01-dashboard.png` through `05-admin.png` from `frontend/resources/play-store/` |
| App category | Business |
| Tags | Business, Productivity |
| Contact email | harivanshraj9@gmail.com |
| Contact phone | *(optional — your business number)* |
| Website | https://prathvipowersolutions.com |
| Privacy policy | https://prathvipowersolutions.com/privacy |

**Full description — paste this:**
```
PPS Connect is the mobile companion for the Prathvi Power Solutions team.
Every business operation — daily expenses, HRMS & payroll, vendor billing,
and DISCOM consumer master data — brought together in one clean, secure app.

Features
• Daily Expenses — log spends in three taps, snap a bill photo, and search
  every past entry.
• HRMS & Payroll — employee master, daily attendance, leave tracking, and
  automatic monthly payroll (PF + ESIC).
• Vendor Billing — WCC PDF parsing, bulk invoice generation with GST, branded
  PDF prints, payment history, and customer statements.
• DISCOM — 4-division consumer master data (SITAPUR I & II, BISWAN III,
  MAHMUDABAD IV) — search 700,000+ consumers by KNO, name, mobile or meter.
• Secure admin panel with role-based access (Super Admin / Admin / Staff /
  Viewer) and full audit log.
• Works offline-aware — clear banner when your device drops connection.

Access is restricted to authorised Prathvi Power Solutions team members.
Contact your administrator for an account.
```

### 5.3 App content
Fill each section on the left rail:

| Section | Answer |
|---|---|
| **Privacy policy** | https://prathvipowersolutions.com/privacy |
| **Ads** | No, my app does not contain ads |
| **App access** | All or some functionality is restricted → provide login credentials for review: **email:** `harivanshraj9@gmail.com` **password:** `Prathvi@Admin2026` (Google's reviewers only) |
| **Content rating** | Complete the questionnaire — for a business tool everything is **No**. Rating will come out as **Everyone**. |
| **Target audience** | Age: **18 and older**. This app is not directed to children. |
| **News app** | No |
| **COVID-19 contact tracing** | No |
| **Data safety** | See **Data Safety form** below |
| **Government apps** | No |
| **Financial features** | Yes → tick "Uploads/downloads or processes personal financial data" (invoices, expenses). Answer follow-ups honestly — you don't accept payments *inside* the app. |
| **Health features** | No |
| **Managing user-generated content** | No, the app does not display user-generated content |

**Data Safety form** — the honest minimum for PPS Connect:

*Data collected (link to each):*
- **Personal info** → Name, Email, Phone number, User ID (employee ID). Collected + shared: NO third-party sharing. Processed: server. Purpose: **Account management, App functionality**. Optional: **No**. Encrypted in transit: **Yes**. Users can request deletion: **Yes** — contact administrator.
- **Financial info** → Purchase history / other financial info (expenses/invoices). Same answers as above.
- **Photos** (bill attachments) — Optional. Purpose: **App functionality**. Encrypted in transit: **Yes**.
- **App activity** → App interactions, in-app search history. Purpose: **Analytics, App functionality**.

*Data NOT collected:* Location, Contacts, Calendar, SMS, Health, Advertising ID.

*Security practices:*
- All data encrypted in transit: **Yes**
- User can request data deletion: **Yes**
- Committed to Play Families Policy: not applicable (not a family app)

### 5.4 Countries / regions
- Available in: **India** (start here). You can expand later.

### 5.5 Pricing & distribution
- Free
- Devices: **Phone + tablet**
- Contains ads: No
- Content guidelines + US export laws: both ticked

---

## 6. Upload the AAB & submit for review (~5 min)

Play Console → Left rail → **Production** → **Create new release**.

1. **Play App Signing** — accept Google's managed signing (recommended). Google keeps your upload key safe.
2. **Upload AAB** — drag `frontend/android/app/build/outputs/bundle/release/app-release.aab` into the drop zone.
3. **Release name** — auto-fills as `1.0.0 (1)`. Keep.
4. **Release notes** (English) — paste:
```
Initial release of PPS Connect.
· Daily Expenses with bill-photo attach
· HRMS & Payroll (attendance, leave, PF/ESIC payroll)
· Vendor Billing (WCC parsing, invoices, statements)
· DISCOM consumer master data (740K+ records)
· Secure admin panel with role-based access
```
5. Click **Next** → **Save** → **Review release** → **Start rollout to production**.

Google reviews the app. Timeline: **1–7 days** for a first release. You'll get email updates in Play Console.

---

## 7. Future releases (~10 min each)

Every time you want to ship an update:

```bash
# 1. Bump version in android/app/build.gradle
#    versionCode 2  (integer, must always increase)
#    versionName "1.0.1"  (any string)

cd frontend
yarn build && npx cap sync android
cd android && ./gradlew bundleRelease
```

Then in Play Console → **Production** → **Create new release** → upload the new AAB → release notes → **Start rollout**.

---

## Common gotchas

| Symptom | Fix |
|---|---|
| `SDK location not found` on gradle | Create `frontend/android/local.properties` with `sdk.dir=/absolute/path/to/Android/Sdk` |
| Play Console: "Upload key mismatch" | You uploaded an unsigned or wrong-key AAB. Re-check `key.properties` and rebuild. |
| Google reviewer emails asking for login access | You forgot to fill **App content → App access** with test credentials |
| Warning: "Your app targets an older Android API" | Update `targetSdkVersion` in `frontend/android/variables.gradle` (currently 34 → bump when Google requires higher) |
| APK / AAB > 150 MB | Not applicable — PPS Connect ships as a thin WebView shell (~5 MB) |

---

## Checklist (print this)

Before hitting "Start rollout":
- [ ] Keystore backed up to at least 2 places, passwords in password manager
- [ ] `frontend/android/key.properties` NOT committed to git
- [ ] `yarn build && npx cap sync android` ran cleanly
- [ ] `./gradlew bundleRelease` produced `app-release.aab`
- [ ] `jarsigner -verify` shows "jar verified"
- [ ] Icon 512, feature graphic 1024×500, at least 2 phone screenshots uploaded
- [ ] Privacy policy URL loads
- [ ] Data safety form submitted
- [ ] App content: App access filled with reviewer login
- [ ] Content rating completed (comes out Everyone)
- [ ] Target audience set to 18+
- [ ] Release notes written
- [ ] Countries selected

You're clear to ship. 🚀
