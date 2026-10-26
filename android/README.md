# Task Sorter, as an Android app

This folder wraps the game into an APK. It does **not** contain a copy of
the game — `app/build.gradle` stages the repository root into the APK's
assets at build time, so the app and the website are always built from
exactly the same files and cannot drift apart.

## Build it

```sh
./gradlew assembleDebug
```

The APK lands at `app/build/outputs/apk/debug/app-debug.apk`.

You need a JDK (17 or newer) and the Android SDK. If Gradle cannot find
the SDK, point it at one:

```sh
echo "sdk.dir=/path/to/android-sdk" > local.properties
```

`local.properties` is machine-specific and is not committed.

Installing Android Studio gets you both, and it will open this folder
directly.

## Installing the APK on a phone

The debug APK is signed with the standard Android debug key, which is
enough to install and play but is **not** a key you would publish under.
On the phone: Settings → Security → allow installing from unknown
sources, then open the file.

For a store release, generate your own keystore and add a
`signingConfigs` block to `app/build.gradle`. Keep the keystore out of
this repository — anyone holding it can publish updates as you.

## What the app actually is

One `Activity` holding one `WebView`. There is no second implementation
of the game and no JavaScript bridge: nothing in `js/` knows it is
inside an app, which is why there is only ever one game to test.

Three decisions in `MainActivity.java` are worth knowing about, and each
is explained where it happens:

- **The game is served over `https://appassets.androidplatform.net/`,
  not loaded from `file://`.** A `file://` page is an opaque origin,
  where local storage is unreliable and every request is cross-origin
  from `null`. This game keeps all of your progress in `localStorage`.
  `WebViewAssetLoader` serves the same files over a real secure origin
  that never leaves the device, so the app behaves exactly like the
  browser the game was tested in.

- **Back means "go up one", not "quit".** A single-page game has no
  browser history, so the default back behaviour would drop you out of
  the app entirely on the first press, mid-round. The page's own
  `Nav.back()` is asked instead: it closes a sheet, pauses a round, or
  goes home, and only says "leave" from the home screen.

- **Two permissions, both granted at install, neither asked of the
  player.** `INTERNET` is for the optional cloud save - everything needed
  to play is inside the APK, and the game is fully playable with no
  signal at all. `VIBRATE` is for the buzz when a card lands, and
  Settings turns it off.

## Size

About 3.4 MB. The game itself is under 700 KB; the rest is the AndroidX
libraries. The competition allows 100 MB.

## Testing it

See **TESTING.md** — how to run this on a laptop with no Android phone,
what the emulator run found, and the list to repeat on the first real
device it reaches.

---

## HUAWEI Game Service (leaderboards and achievements)

The game already reports everything; the app only has to pass it on. Badges
call `GameServices.unlockAchievement(id)` and scores call
`GameServices.submitScore(board, score)`, through `window.HuaweiGames`
(`js/services.js`). Today both only write to the log (`adb logcat -s
TaskSorterGames`). To connect them:

1. Sign up as a HUAWEI developer, and create the app in **AppGallery Connect**
   with the package name `com.tasksorter.game`.
2. Turn on **Game Service** for it, and add the signing certificate's SHA-256
   fingerprint to the project.
3. Download `agconnect-services.json` into `android/app/`, and add the
   `com.huawei.agconnect` Gradle plugin plus the HMS `game` SDK, as HUAWEI's
   current Game Service guide describes.
4. Create the ids below in AppGallery Connect, then put the HMS calls in the
   two marked lines in `GameServices.java`, mapping each game id to the
   HUAWEI one. Sign the player in first (HUAWEI ID), as the guide shows.

**Achievements** (one per badge in `js/missions.js`):
`first_pass` `trail` `all_s` `boss_1` `boss_all` `combo8` `perfect15` `flawless` `later50` `gold25` `ice25` `daily3` `daily7` `mylist` `pets5` `saver` 

**Leaderboards:** `daily` (today's Daily Challenge score), and `level1` to
`level4` (a passed level's score).

None of this changes the game: in a browser, or with the bridge left as it is,
every call is a quiet no-op.

## What is not done yet

- Never run on real hardware. It **has** now been run: installed on an
  Android 15 emulator (Pixel 7, API 35) and taken through the whole of
  TESTING.md — the save survives a cold start, all four corners take a
  real finger swipe, back behaves, it stays portrait, it clears a notch,
  it runs at 60 fps and it works with the network off. Three bugs came
  out of that run and are fixed. But an emulator is not a phone, and it
  cannot tell you about a cheap chipset or how a swipe feels.
  **Install it on a real one before the final submission.**
- No release signing config. See above.
- Portrait only. The arena is four corners around a card; on its side
  that is a very wide, very short board.
