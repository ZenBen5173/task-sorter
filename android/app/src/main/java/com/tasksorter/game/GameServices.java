package com.tasksorter.game;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;

import com.huawei.hms.analytics.HiAnalytics;
import com.huawei.hms.analytics.HiAnalyticsInstance;
import com.huawei.hms.common.ApiException;
import com.huawei.hms.jos.AppParams;
import com.huawei.hms.jos.JosApps;
import com.huawei.hms.jos.games.Games;
import com.huawei.hms.support.account.AccountAuthManager;
import com.huawei.hms.support.account.request.AccountAuthParams;
import com.huawei.hms.support.account.result.AuthAccount;
import com.huawei.hms.support.account.service.AccountAuthService;

/**
 * HUAWEI Mobile Services: HUAWEI ID sign-in and Analytics Kit.
 *
 * <p>The page sees this as {@code window.HuaweiGames} (see
 * {@code js/services.js}). Every badge the player earns calls
 * {@link #unlockAchievement}, and every daily score and passed level
 * calls {@link #submitScore}. Both go to Analytics Kit as events, so the
 * AppGallery Connect dashboard shows which badges players reach, how
 * Daily scores spread and where in the trail people stop.
 *
 * <p>Why not Game Service achievements and leaderboards, which is what
 * these calls were first written for: HUAWEI took both out of the Game
 * Service SDK in 6.14.0.300 (September 2024). The names stayed so that
 * nothing in the game had to change.
 *
 * <p>On launch the player is signed in with their HUAWEI ID through Game
 * Service - silently if they have been before, with HUAWEI's own sheet
 * if not.
 *
 * <p>All of it is off when the APK was built without
 * {@code agconnect-services.json} ({@link BuildConfig#HMS_READY}): then
 * both calls only write to the log.
 *
 * <p>Only the game's own page can reach this: MainActivity loads nothing
 * but its bundled files, and sends every other address out to the
 * browser.
 */
public class GameServices {

    private static final String TAG = "TaskSorterGames";

    /** The request code for HUAWEI's sign-in sheet, for onActivityResult. */
    static final int SIGN_IN = 4101;

    private final Activity activity;
    private HiAnalyticsInstance analytics;

    GameServices(Activity activity) {
        this.activity = activity;
    }

    /** Called once from MainActivity.onCreate. */
    void start() {
        if (!BuildConfig.HMS_READY) return;
        analytics = HiAnalytics.getInstance(activity);
        JosApps.getJosAppsClient(activity).init(new AppParams(AccountAuthParams.DEFAULT_AUTH_REQUEST_PARAM_GAME));
        signIn();
    }

    private AccountAuthService auth() {
        return AccountAuthManager.getService(activity, AccountAuthParams.DEFAULT_AUTH_REQUEST_PARAM_GAME);
    }

    /* Silent first. Only a player who has never signed in to this game
       sees HUAWEI's sheet, and only once. */
    private void signIn() {
        auth().silentSignIn()
                .addOnSuccessListener(this::signedIn)
                .addOnFailureListener(e -> {
                    if (e instanceof ApiException) {
                        activity.startActivityForResult(auth().getSignInIntent(), SIGN_IN);
                    } else {
                        Log.w(TAG, "sign-in failed", e);
                    }
                });
    }

    /** From MainActivity.onActivityResult, when HUAWEI's sign-in sheet closes. */
    void onSignInResult(Intent data) {
        AccountAuthManager.parseAuthResultFromIntent(data)
                .addOnSuccessListener(this::signedIn)
                .addOnFailureListener(e -> Log.w(TAG, "sign-in cancelled", e));
    }

    private void signedIn(AuthAccount account) {
        /* Game Service only counts a player once it has been asked who
           they are - this is that call. */
        Games.getPlayersClient(activity).getCurrentPlayer()
                .addOnSuccessListener(p -> Log.i(TAG, "signed in"))
                .addOnFailureListener(e -> Log.w(TAG, "player lookup failed", e));
    }

    private void event(String name, Bundle b) {
        if (analytics != null) analytics.onEvent(name, b);
    }

    @JavascriptInterface
    public void unlockAchievement(String id) {
        if (id == null || id.length() > 40) return;
        Log.i(TAG, "achievement " + id);
        Bundle b = new Bundle();
        b.putString("badge", id);
        event("badge_earned", b);
    }

    @JavascriptInterface
    public void submitScore(String board, double score) {
        if (board == null || board.length() > 20 || score < 0) return;
        Log.i(TAG, "score " + board + " = " + (long) score);
        Bundle b = new Bundle();
        b.putString("board", board);
        b.putLong("score", (long) score);
        event("round_score", b);
    }
}
