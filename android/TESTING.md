# Testing the app on a laptop

**Status: the APK has been run.** It was installed on an Android 15 emulator
(Pixel 7, API 35, 1080x2400) and taken through the whole list below. Three bugs
came out of that run and all three are fixed; what was checked and what is still
open is in **What the run found**, further down.

It has still never run on **physical hardware**. An emulator is a real Android
and a real WebView, which is enough to trust the list below — it is not enough
to tell you how the game feels in a hand, or how it behaves on a cheap phone.
Install it on a real one before the final submission.

This page is how to repeat the run without owning an Android phone.

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

### 2. Install the SDK

<https://developer.android.com/studio>

Android Studio brings the JDK, the SDK, the emulator and the AVD manager in one
install, and it will open this project directly. Take it if you want an IDE.

If you only want to run the thing, take the **command-line tools** from the
bottom of that same page instead — about 3 GB all in, no admin rights, and the
four commands at the end of step 4 do the rest. That is how the emulator run
documented on this page was done.

On first launch of Studio, let it complete the setup wizard — that is what
downloads the SDK.

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

- **Windows:** check before you believe you have none. In PowerShell,
  `(Get-CimInstance Win32_OptionalFeature -Filter "Name='HypervisorPlatform'").InstallState`
  returns 1 when it is on. Do **not** trust
  `Win32_Processor.VirtualizationFirmwareEnabled` — when a hypervisor is already
  running (Hyper-V, WSL2, or Memory Integrity) that property reads `False` on a
  machine where virtualisation plainly works, which is what made an earlier
  version of this page claim the build machine had none. It had it all along.
  If it really is off: enable it in the BIOS, and turn on *Windows Hypervisor
  Platform* in "Turn Windows features on or off".
- **Mac:** works out of the box on Apple silicon.
- **Linux:** you need `/dev/kvm` and your user in the `kvm` group.

You do not need Android Studio for any of this. The command-line tools are
about 3 GB, need no admin rights, and are enough to build, install and drive
the app:

```sh
# unzip commandlinetools-win into <sdk>/cmdline-tools/latest, then
sdkmanager platform-tools emulator "platforms;android-35"            "build-tools;35.0.0" "system-images;android-35;google_apis;x86_64"
avdmanager create avd -n tasksorter -k "system-images;android-35;google_apis;x86_64" -d pixel_7
emulator -avd tasksorter
```

### 5. Run it

Press **▶ Run** in Android Studio with the emulator selected.

Or from a terminal:

```sh
cd android
./gradlew assembleDebug                     # gradlew.bat on Windows
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## What the run found

Three bugs. All three are fixed.

**1. Gear went stale the moment you bought something.** Tapping a tile redrew
the shelf and nothing else, so the character at the top of the screen, the line
naming what it has on, the full-set banner and the stats panel all kept showing
the previous gear until you left the screen and came back. Buying a shield and
watching the character not change reads like the purchase failed. `Shop.tap()`
now repaints Hero as well.

**2. The soundtrack started before anyone had touched the screen.** The sound
code was written around a browser handing back a suspended AudioContext and
refusing to play until the first tap. An Android WebView hands back a *running*
one. Measured on a wiped profile with no taps at all: context `running`, master
gain `0.3`, twenty live note gains. The game sang over the launcher animation.
`UI.sound` now keeps that gate itself instead of reading it off the context.

**3. The end screen lied about unlocks on a replay.** Going back to level 1 for
coins and failing it announced *"Level 2 stays locked"* about a level that had
been open for hours. Passing it again announced *"Level 2 unlocked"* for the
same level, a second time. Beating an already-beaten boss re-announced the next
one. And failing the last level said *"Get 75% right to open it"*, where "it"
was nothing at all — there is no level 5. All four now say what is true.

### What passed

Checked on the emulator, in this order:

- **The save survives a cold start.** Two levels, three purchases and a name,
  then `am force-stop`, then relaunch: the save came back byte-identical and the
  home screen showed all of it.
- **No blank screen, no white flash.** The window background is the game's own
  `#0a0e1a`. (A screenshot four seconds in *was* blank — that is a cold emulator
  still painting, not a fault. Give it ten.)
- **Touch.** Real finger swipes land in all four corners; every scrolling screen
  reaches its bottom; the page never moved underneath a swipe.
- **Back.** Mid-round leaves the level and keeps the app open; Gear and the
  Guide Book go up one; on the home screen it leaves the app.
- **Portrait.** Forcing the device to landscape did not rotate the game.
- **The notch.** With the `tall` cutout overlay on, `--safe-t` read 48px and the
  header sat exactly at 48. Nothing hid behind it.
- **The keyboard.** The name box focuses, types and saves, with no reload and no
  squashed layout.
- **Offline.** Wifi and data off, no default network: identical render, both
  bundled fonts loaded, typography unchanged.
- **Speed.** 180 frames inside a live round: 60.6 fps, worst frame 16.8ms, not a
  single frame over 33ms.
- **Sound lifecycle.** Silent until the first tap, plays after it, every gain
  drops to zero on the home button, back to 0.3 on return.

### Still open

- **A real phone.** Everything above is an emulator. It cannot tell you about a
  cheap chipset, a real notch, or how a swipe feels.
- **The twenty HUAWEI IDs.** Still twenty people with twenty phones. See the
  warning at the top of this page.

---

## The list itself

Repeat these on the first real device the app reaches. This is the same list the
emulator run worked through, in the same order — roughly how badly each would
hurt.

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

- Music should start on your **first tap**, not before. Do not assume the
  platform enforces this: a WebView does **not** block audio the way a browser
  tab does, and for a while the game sang before anybody touched it. `UI.sound`
  holds that gate itself now, so this is a test of our code, not Android's.
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
