package com.dotmatrixsolutions.vibeos;

import android.app.Notification;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

public class VibeNotificationListener extends NotificationListenerService {
    private static final int LIMIT = 20;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;
        try {
            String raw = getSharedPreferences("vibeos_native", MODE_PRIVATE)
                    .getString("recent_notifications", "[]");
            JSONArray old = new JSONArray(raw);
            JSONArray next = new JSONArray();

            Notification n = sbn.getNotification();
            CharSequence title = n.extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence text = n.extras.getCharSequence(Notification.EXTRA_TEXT);

            JSONObject item = new JSONObject();
            item.put("package", sbn.getPackageName());
            item.put("title", title == null ? "" : title.toString());
            item.put("text", text == null ? "" : text.toString());
            item.put("time", sbn.getPostTime());
            next.put(item);

            for (int i = 0; i < old.length() && next.length() < LIMIT; i++) next.put(old.get(i));

            getSharedPreferences("vibeos_native", MODE_PRIVATE)
                    .edit().putString("recent_notifications", next.toString()).apply();
        } catch (Exception ignored) { }
    }
}
