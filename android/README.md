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
  the app entirely on the first press, mid-round. The page is asked to
  press whichever of its own back controls is showing instead.

- **`INTERNET` is the only permission.** Everything needed to play —
  code, art, fonts, soundtrack — is inside the APK. The permission is
  for the optional cloud save, and the game is fully playable with it
  refused or with no signal at all.

## Size

About 3.4 MB. The game itself is under 700 KB; the rest is the AndroidX
libraries. The competition allows 100 MB.

## What is not done yet

- Never run on real hardware. It was built and its packaged contents
  were tested by serving the APK's own assets and running the game's
  full browser test suite against them — every sprite resolves, the shop
  works, touch scrolling works, a level plays end to end, and the fonts
  load with the network blocked. That is not the same as a device.
  **Install it on a phone before relying on it.**
- No release signing config. See above.
- Portrait only. The arena is four corners around a card; on its side
  that is a very wide, very short board.
