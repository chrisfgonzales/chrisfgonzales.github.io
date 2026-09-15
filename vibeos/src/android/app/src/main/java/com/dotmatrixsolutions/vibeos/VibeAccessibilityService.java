package com.dotmatrixsolutions.vibeos;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;

public class VibeAccessibilityService extends AccessibilityService {
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;
        getSharedPreferences("vibeos_native", MODE_PRIVATE)
                .edit()
                .putString("foreground_package", event.getPackageName().toString())
                .putLong("foreground_package_time", System.currentTimeMillis())
                .apply();
    }

    @Override
    public void onInterrupt() { }
}
