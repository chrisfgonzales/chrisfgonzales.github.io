package com.dotmatrixsolutions.vibeos;

import android.accessibilityservice.AccessibilityService;
import android.content.SharedPreferences;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;

public class VibeAccessibilityService extends AccessibilityService {
    private static final String TAG = "VibeAccessibilityService";
    private static final int MAX_PACKAGE_LENGTH = 200;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                || event.getPackageName() == null) return;
        String packageName = event.getPackageName().toString();
        if (packageName.length() > MAX_PACKAGE_LENGTH) {
            Log.w(TAG, "Ignoring an unexpectedly long foreground package name.");
            return;
        }
        getSharedPreferences(VibeNotificationListener.PREFERENCES, MODE_PRIVATE)
                .edit()
                .putString("foreground_package", event.getPackageName().toString())
                .putLong("foreground_package_time", System.currentTimeMillis())
                .apply();
    }

    @Override
    public void onInterrupt() { }
}
