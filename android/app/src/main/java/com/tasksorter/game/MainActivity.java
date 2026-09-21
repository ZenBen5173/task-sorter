package com.tasksorter.game;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;

/**
 * Task Sorter, as an Android app.
 *
 * <p>The whole thing is one WebView holding the same game that runs on
 * the web. There is no second implementation and no bridge: the game
 * does not know it is inside an app, and nothing in js/ had to change
 * for this to exist.
 *
 * <p><b>IT IS SERVED OVER HTTPS, NOT LOADED FROM file://.</b> The
 * obvious way to put a web game in a WebView is
 * {@code loadUrl("file:///android_asset/index.html")}, and it mostly
 * works, which is the problem. A {@code file://} page is an opaque
 * origin, and a browser treats an opaque origin as nobody: local
 * storage is unreliable there, requests to anything else are a
 * cross-origin request from {@code null}, and the rules differ between
 * WebView versions. This game keeps every scrap of progress in
 * {@code localStorage} and syncs it to Supabase, so "mostly works"
 * means somebody's save disappears on a device nobody tested.
 *
 * <p>{@link WebViewAssetLoader} serves the same files over
 * {@code https://appassets.androidplatform.net/}, which is a real,
 * secure origin that never leaves the device. The game then behaves in
 * the app exactly as it behaves in the browser it was tested in, which
 * is the entire point.
 */
public class MainActivity extends AppCompatActivity {

    /** The game's own background, so there is no white flash on launch. */
    private static final int BACKDROP = Color.parseColor("#0a0e1a");

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(BACKDROP);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        /* The save. Without this the game starts from nothing every
           time it is opened, which is the one failure nobody forgives. */
        s.setDomStorageEnabled(true);
        /* The page sets its own viewport and is built for a phone. Left
           on, the WebView second-guesses it and renders the game as a
           zoomed-out desktop page. */
        s.setUseWideViewPort(false);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);   // ignore the system font scale; this is a game, not a document

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            /* Anything that is not the game itself - a licence link in
               the credits, say - belongs in the browser, not in here.
               A WebView with no address bar and no way back is the
               worst place to open somebody else's website. */
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("appassets.androidplatform.net".equals(u.getHost())) return false;
                try {
                    startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, u));
                } catch (Exception ignored) { /* no browser: stay put rather than crash */ }
                return true;
            }
        });

        /* Edge to edge. index.html already asks for viewport-fit=cover
           and the CSS already keeps clear of the notch with
           env(safe-area-inset-*), so the page is expecting to be given
           the whole screen and knows what to do with it. */
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().setNavigationBarColor(Color.TRANSPARENT);
        }
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);

        setContentView(web);
        web.loadUrl("https://appassets.androidplatform.net/index.html");

        wireBackButton();
    }

    /**
     * The system back button.
     *
     * <p>A single-page game has no browser history, so the default
     * behaviour - close the app - would drop somebody out of the game
     * entirely on their first back press, half way through a round.
     *
     * <p>Instead back means what it means everywhere else in the game:
     * go up one. The page is asked to press whichever of its own back
     * controls is showing, and only when there is none - when you are
     * already on the home screen - does back leave.
     *
     * <p>It is asked in JavaScript rather than through a bridge on
     * purpose. A bridge would mean the game had to know it was in an
     * app, and then the web build and the app build are two different
     * games.
     */
    private void wireBackButton() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                web.evaluateJavascript(
                        "(function(){"
                      + "  var s = document.querySelector('.screen.is-on');"
                      + "  if (!s || s.id === 'screen-home') return 'leave';"
                      + "  var ids = ['#btn-exit','#btn-lv-back','#btn-guide-back','#tab-home'];"
                      + "  for (var i = 0; i < ids.length; i++) {"
                      + "    var b = document.querySelector(ids[i]);"
                      + "    if (b && b.offsetParent) { b.click(); return 'handled'; }"
                      + "  }"
                      + "  return 'leave';"
                      + "})()",
                        value -> {
                            if (value == null || value.contains("leave")) finish();
                        });
            }
        });
    }

    /* A game that keeps playing its soundtrack in your pocket is a game
       that gets uninstalled. onPause/onResume also stop the round's
       clock, because a level should not run down while the phone is
       locked. */
    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        web.pauseTimers();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.resumeTimers();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
