# Testing the app on a laptop

The APK has been built and its contents verified, but it has **never been run**
— the machine it was built on has no hardware virtualisation, so no emulator
and no device. This is how to close that gap without owning an Android phone.

---

## ⚠️ Read this first: an emulator will not get you the 20 HUAWEI IDs

An emulator is fine for **testing the app**. Do not plan on it for the
competition's twenty GameCenter accounts.

The form says the IDs **"must be from 20 different devices"**. Twenty emulators
on one laptop are one machine wearing twenty hats, and they are trivially
detectable as such. Even setting aside whether it would be caught, it is not
what the requirement is asking for.

**The 20 IDs still need 20 real people with 20 real Android phones.** That is a
separate job and it is still the one most likely to sink the entry. Keep
chasing it in parallel with this.

---

## Setup

### 1. Get the repo

```sh
git clone https://github.com/ZenBen5173/task-sorter.git
cd task-sorter
```

### 2. Install Android Studio

<https://developer.android.com/studio>

It brings the JDK, the SDK, the emulator and the AVD manager in one install.
Doing this piecemeal from the command line works too and is more fiddly; there
is no prize for it.

On first launch let it complete the setup wizard — that is what downloads the
SDK.

### 3. Open the project

**File → Open →** pick the `android` folder, **not** the repository root.

Gradle will sync. The first sync downloads dependencies and takes a few
minutes.

### 4. Make a virtual phone

**Tools → Device Manager → Create Device.**

- **Pick a phone with a notch** — Pixel 6 or 7. The game uses
  `env(safe-area-inset-*)` to keep clear of one, and a notchless device tests
  none of that.
- **System image: API 34 or 35.** The app's floor is API 24, so also make a
  second AVD on **API 24** if you want to check the floor holds.
- Finish, then press **▶**.

If the emulator refuses to start, it is almost always virtualisation:

- **Windows:** enable virtualisation in the BIOS, and turn on *Windows
  Hypervisor Platform* in "Turn Windows features on or off".
- **Mac:** works out of the box on Apple silicon.
- **Linux:** you need `/dev/kvm` and your user in the `kvm` group.

### 5. Run it

Press **▶ Run** in Android Studio with the emulator selected.

Or from a terminal:

```sh
cd android
./gradlew assembleDebug                     # gradlew.bat on Windows
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## What to actually test

Not "have a play" — these are the specific things that were never verified,
roughly in order of how badly each would hurt.

### The save (the one that matters most)

The whole game's progress lives in `localStorage`. It is served over
`https://appassets.androidplatform.net/` rather than `file://` precisely so
that storage is reliable, but that is a decision that has never been observed
working.

1. Play a level, buy something in the shop, name your character.
2. **Close the app completely** — swipe it out of the recents list, not just
   back to the home screen.
3. Reopen it.

**Your coins, your level, your gear and your name must all still be there.** If
they are not, nothing else on this list matters.

### It launches at all

- Does the game appear, or a blank white or black screen? A blank screen means
  the asset loader is not serving — check `adb logcat` for `WebViewAssetLoader`.
- Is there a **white flash** between tapping the icon and the game? There
  should not be; the window background is set to the game's own dark colour.
- Is the **launcher icon** the four coloured corners with a card?

### Touch

This is where the web version was broken before, so it is worth being thorough.

- **Scroll the Gear screen** with a finger, all the way to the bottom.
- Scroll **Me** and **Boss** too.
- **Swipe a card** into each of the four corners.
- Confirm the page does **not** slide about underneath you while you swipe.

### The back button

- Mid-round → should leave the level, not close the app.
- On the map, Gear, Me, Guide → should go back one screen.
- On the home screen → *now* it should close the app.

### Sound

- Music should start on your **first tap**, not before — Android blocks audio
  until the page is touched.
- **Press the home button.** The music must stop, not keep playing in your
  pocket.
- Come back: it should resume.
- Turn the switch off on the **Me** screen: music and effects both stop, and
  stay off after closing and reopening the app.

### The screen itself

- On a notched device, is anything hidden behind the notch or the gesture bar?
- Rotate the phone: it should **stay portrait**.
- Open the character name box: the keyboard should appear without reloading
  the game or breaking the layout.

### Speed

- Do cards fly in smoothly, or does it stutter?
- Watch the falling petals and the pet animation — those are the most likely to
  cost frames on a slow device.

An emulator is *slower* than a real phone for graphics, so a stutter here is
not proof of a problem — but smooth here almost certainly means smooth there.

### With no internet

Turn the emulator's network off (**Extended controls → Cellular → Data status:
Denied**, and Wi-Fi off).

**Everything except the cloud save must work exactly as before** — fonts,
music, art, all of it. That is the whole reason the fonts are bundled and the
soundtrack is generated. If the typography changes with the network off,
something is still being fetched.

---

## Reporting what you find

`adb logcat | grep -i chromium` shows the WebView's console, which is where a
JavaScript error will appear.

A screenshot plus the last twenty lines of that is usually enough to diagnose
anything on this list.

---

## Testing the game without an emulator

You do not need any of the above to test the **game** — only the Android
wrapper around it.

Open <https://task-sorter-one.vercel.app> in Chrome, press **F12**, then the
device-toolbar button (Ctrl+Shift+M) and pick a phone. That gives you touch
emulation, a phone-sized viewport and the console.

It will not tell you anything about the APK, the save inside the app, or the
back button — but it catches game bugs in seconds instead of minutes.
