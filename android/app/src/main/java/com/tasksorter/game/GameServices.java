package com.tasksorter.game;

import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * Where HUAWEI Game Service plugs in.
 *
 * <p>The page sees this as {@code window.HuaweiGames} (see
 * {@code js/services.js}). Every badge the player earns calls
 * {@link #unlockAchievement}, and every daily score and passed level
 * calls {@link #submitScore}. Today both only write to the log, because
 * connecting them needs things that cannot live in a repository: a
 * HUAWEI developer account, an AppGallery Connect project with this app
 * registered, its {@code agconnect-services.json}, and the signing
 * certificate's fingerprint on that project.
 *
 * <p>Once those exist, the HMS calls go in the two marked places below
 * and nothing else in the game has to change. android/README.md lists
 * the achievement and leaderboard ids to create.
 *
 * <p>Only the game's own page can reach this: MainActivity loads nothing
 * but its bundled files, and sends every other address out to the
 * browser.
 */
public class GameServices {

    private static final String TAG = "TaskSorterGames";

    @JavascriptInterface
    public void unlockAchievement(String id) {
        if (id == null || id.length() > 40) return;
        Log.i(TAG, "achievement " + id);
        // HMS: Games.getAchievementsClient(activity).grow / reach(<achievement id for `id`>)
    }

    @JavascriptInterface
    public void submitScore(String board, double score) {
        if (board == null || board.length() > 20 || score < 0) return;
        Log.i(TAG, "score " + board + " = " + (long) score);
        // HMS: Games.getRankingsClient(activity).submitRankingScore(<ranking id for `board`>, (long) score)
    }
}
