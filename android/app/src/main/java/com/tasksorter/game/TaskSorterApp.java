package com.tasksorter.game;

import android.app.Application;

import com.huawei.hms.api.HuaweiMobileServicesUtil;

/**
 * Exists for one line: HUAWEI Game Service needs the Application handed to
 * it before any Activity starts, so it can show its own sign-in and
 * update screens over the game.
 */
public class TaskSorterApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        if (BuildConfig.HMS_READY) HuaweiMobileServicesUtil.setApplication(this);
    }
}
