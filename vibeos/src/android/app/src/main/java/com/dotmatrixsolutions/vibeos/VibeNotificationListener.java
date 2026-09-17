package com.dotmatrixsolutions.vibeos;

import android.app.Notification;
import android.content.SharedPreferences;
import android.util.Log;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class VibeNotificationListener extends NotificationListenerService {
    private static final int LIMIT = 20;
    private static final int MAX_PACKAGE_LENGTH = 200;
    private static final int MAX_TITLE_LENGTH = 240;
    private static final int MAX_TEXT_LENGTH = 500;
    private static final String TAG = "VibeNotificationListener";
    static final String PREFERENCES = "vibeos_native";
    static final String RECENT_NOTIFICATIONS = "recent_notifications";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;
        SharedPreferences preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE);
        try {
            String raw = preferences.getString(RECENT_NOTIFICATIONS, "[]");
            JSONArray old = new JSONArray(raw);
            JSONArray next = new JSONArray();

            Notification n = sbn.getNotification();
            CharSequence title = n.extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence text = n.extras.getCharSequence(Notification.EXTRA_TEXT);

            JSONObject item = new JSONObject();
            item.put("package", bounded(sbn.getPackageName(), MAX_PACKAGE_LENGTH));
            item.put("title", bounded(title == null ? "" : title.toString(), MAX_TITLE_LENGTH));
            item.put("text", bounded(text == null ? "" : text.toString(), MAX_TEXT_LENGTH));
            item.put("time", sbn.getPostTime());
            next.put(item);

            for (int i = 0; i < old.length() && next.length() < LIMIT; i++) next.put(old.get(i));

            preferences.edit().putString(RECENT_NOTIFICATIONS, next.toString()).apply();
        } catch (JSONException e) {
            Log.w(TAG, "Could not store notification context; resetting malformed local data.", e);
            preferences.edit().remove(RECENT_NOTIFICATIONS).apply();
        }
    }

    @Override
    public void onListenerDisconnected() {
        getSharedPreferences(PREFERENCES, MODE_PRIVATE)
                .edit().remove(RECENT_NOTIFICATIONS).apply();
        super.onListenerDisconnected();
    }

    private static String bounded(String value, int maximumLength) {
        if (value == null) return "";
        return value.length() <= maximumLength ? value : value.substring(0, maximumLength);
    }
}
