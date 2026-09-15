package com.dotmatrixsolutions.vibeos;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.PackageManager.NameNotFoundException;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {
    private static final String TAG = "VibeOS";
    private static final int FILE_CHOOSER_REQUEST = 7001;
    private static final int MAX_SHARED_TEXT_LENGTH = 10_000;
    private static final int MAX_CLIPBOARD_TEXT_LENGTH = 50_000;
    private static final int MAX_SPEECH_TEXT_LENGTH = 4_000;
    private static final long FOREGROUND_CONTEXT_MAX_AGE_MS = 5 * 60 * 1000L;
    private static final String ASSET_ROOT = "file:///android_asset/www/";
    private static final String LAST_ACTION = "last_native_action";
    private static final String LAST_ACTION_ERROR = "last_native_action_error";

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private TextToSpeech tts;
    private boolean ttsReady;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags
                & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        tts = new TextToSpeech(this, this);
        webView = new WebView(this);
        setContentView(webView);
        configureWebView(webView);
        webView.loadUrl(ASSET_ROOT + "index.html");
    }

    private void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setGeolocationEnabled(false);
        settings.setSaveFormData(false);

        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, false);
        view.addJavascriptInterface(new VibeBridge(), "VibeAndroid");
        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView target, WebResourceRequest request) {
                if (request == null || !request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (isTrustedAssetUri(uri)) return false;
                openExternalUri(uri);
                return true;
            }
        });
        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView target, ValueCallback<Uri[]> callback,
                    FileChooserParams parameters) {
                cancelPendingFileChooser();
                fileChooserCallback = callback;
                if (parameters == null) {
                    failFileChooser("The file picker request was invalid.", null);
                    return true;
                }
                try {
                    Intent picker = parameters.createIntent();
                    picker.addCategory(Intent.CATEGORY_OPENABLE);
                    picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(picker, FILE_CHOOSER_REQUEST);
                } catch (ActivityNotFoundException | SecurityException e) {
                    failFileChooser("No file picker is available.", e);
                }
                return true;
            }
        });
    }

    private boolean isTrustedAssetUri(Uri uri) {
        if (uri == null || !"file".equalsIgnoreCase(uri.getScheme()) || uri.getAuthority() != null) {
            return false;
        }
        String path = uri.getPath();
        return "/android_asset/www/".equals(path)
                || "/android_asset/www/index.html".equals(path)
                || "/android_asset/www/privacy.html".equals(path);
    }

    private void openExternalUri(Uri uri) {
        if (uri == null) {
            reportUserError("That link is invalid.", null);
            return;
        }
        String scheme = uri.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"mailto".equalsIgnoreCase(scheme)
                && !"tel".equalsIgnoreCase(scheme)) {
            reportUserError("That link type is not supported.", null);
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        startSystemActivity(intent, "external-link", "No app can open that link.");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) return;
        ValueCallback<Uri[]> callback = fileChooserCallback;
        fileChooserCallback = null;
        callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
    }

    private void cancelPendingFileChooser() {
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }
    }

    private void failFileChooser(String message, Exception error) {
        cancelPendingFileChooser();
        reportUserError(message, error);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS) {
            Log.w(TAG, "Text-to-speech initialization failed with status " + status);
            return;
        }
        int languageStatus = tts.setLanguage(Locale.getDefault());
        ttsReady = languageStatus != TextToSpeech.LANG_MISSING_DATA
                && languageStatus != TextToSpeech.LANG_NOT_SUPPORTED;
        if (!ttsReady) Log.w(TAG, "The device does not support its default text-to-speech language.");
    }

    @Override
    protected void onDestroy() {
        cancelPendingFileChooser();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (webView != null) {
            webView.removeJavascriptInterface("VibeAndroid");
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private SharedPreferences nativePreferences() {
        return getSharedPreferences(VibeNotificationListener.PREFERENCES, MODE_PRIVATE);
    }

    private boolean isNotificationAccessEnabled() {
        return isServiceEnabled("enabled_notification_listeners",
                new ComponentName(this, VibeNotificationListener.class));
    }

    private boolean isAccessibilityContextEnabled() {
        return isServiceEnabled(Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
                new ComponentName(this, VibeAccessibilityService.class))
                && Settings.Secure.getInt(getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, 0) == 1;
    }

    private boolean isServiceEnabled(String setting, ComponentName service) {
        String enabled = Settings.Secure.getString(getContentResolver(), setting);
        if (enabled == null || enabled.isEmpty()) return false;
        String target = service.flattenToString();
        for (String component : enabled.split(":")) {
            if (target.equalsIgnoreCase(component)) return true;
        }
        return false;
    }

    private void startSystemActivity(Intent intent, String action, String unavailableMessage) {
        if (intent.resolveActivity(getPackageManager()) == null) {
            recordAction(action, "unavailable");
            reportUserError(unavailableMessage, null);
            return;
        }
        try {
            startActivity(intent);
            recordAction(action, "");
        } catch (ActivityNotFoundException | SecurityException e) {
            recordAction(action, "failed");
            reportUserError(unavailableMessage, e);
        }
    }

    private void recordAction(String action, String error) {
        nativePreferences().edit()
                .putString(LAST_ACTION, action)
                .putString(LAST_ACTION_ERROR, error)
                .apply();
    }

    private void reportUserError(String message, Exception error) {
        if (error != null) Log.w(TAG, message, error);
        else Log.w(TAG, message);
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private static String bounded(String text, int maximumLength) {
        if (text == null) return "";
        return text.length() <= maximumLength ? text : text.substring(0, maximumLength);
    }

    public class VibeBridge {
        @JavascriptInterface
        public boolean isNative() {
            return true;
        }

        @JavascriptInterface
        public String getDeviceInfo() {
            JSONObject result = new JSONObject();
            try {
                result.put("manufacturer", Build.MANUFACTURER);
                result.put("model", Build.MODEL);
                result.put("androidVersion", Build.VERSION.RELEASE);
                result.put("sdk", Build.VERSION.SDK_INT);
                result.put("appVersion", getPackageManager()
                        .getPackageInfo(getPackageName(), 0).versionName);
            } catch (NameNotFoundException e) {
                Log.w(TAG, "Could not read the app version.", e);
            } catch (JSONException e) {
                Log.w(TAG, "Could not create device information.", e);
            }
            return result.toString();
        }

        @JavascriptInterface
        public String getCapabilities() {
            return createStatus(false);
        }

        @JavascriptInterface
        public String getNativeStatus() {
            return createStatus(true);
        }

        private String createStatus(boolean includeOperationalStatus) {
            JSONObject result = new JSONObject();
            try {
                boolean notificationAccess = isNotificationAccessEnabled();
                boolean accessibilityEnabled = isAccessibilityContextEnabled();
                result.put("nativeShell", true);
                result.put("notifications", notificationAccess);
                result.put("accessibilityContext", accessibilityEnabled);
                result.put("share", true);
                result.put("tts", ttsReady);
                result.put("vibration", hasVibrator());
                result.put("filePicker", true);
                result.put("offlineAssets", true);
                if (includeOperationalStatus) {
                    result.put("notificationAccessEnabled", notificationAccess);
                    result.put("accessibilityContextEnabled", accessibilityEnabled);
                    result.put("notificationCount", getNotificationCount(notificationAccess));
                    result.put("foregroundContextAvailable", getCurrentAppContextInternal(accessibilityEnabled)
                            .length() > 0);
                    result.put("lastNativeAction", nativePreferences().getString(LAST_ACTION, ""));
                    result.put("lastNativeActionError",
                            nativePreferences().getString(LAST_ACTION_ERROR, ""));
                }
            } catch (JSONException e) {
                Log.w(TAG, "Could not create native capability status.", e);
                return "{\"nativeShell\":true,\"status\":\"unavailable\"}";
            }
            return result.toString();
        }

        @JavascriptInterface
        public String getRecentNotifications() {
            if (!isNotificationAccessEnabled()) return "[]";
            String notifications = nativePreferences()
                    .getString(VibeNotificationListener.RECENT_NOTIFICATIONS, "[]");
            try {
                new JSONArray(notifications);
                return notifications;
            } catch (JSONException e) {
                Log.w(TAG, "Discarding malformed local notification context.", e);
                nativePreferences().edit().remove(VibeNotificationListener.RECENT_NOTIFICATIONS).apply();
                return "[]";
            }
        }

        @JavascriptInterface
        public String getCurrentAppContext() {
            return getCurrentAppContextInternal(isAccessibilityContextEnabled());
        }

        private String getCurrentAppContextInternal(boolean accessibilityEnabled) {
            if (!accessibilityEnabled) return "";
            long capturedAt = nativePreferences().getLong("foreground_package_time", 0L);
            if (System.currentTimeMillis() - capturedAt > FOREGROUND_CONTEXT_MAX_AGE_MS) return "";
            return nativePreferences().getString("foreground_package", "");
        }

        @JavascriptInterface
        public void clearNativeContext() {
            nativePreferences().edit()
                    .remove(VibeNotificationListener.RECENT_NOTIFICATIONS)
                    .remove("foreground_package")
                    .remove("foreground_package_time")
                    .apply();
            recordAction("clear-native-context", "");
        }

        @JavascriptInterface
        public void openNotificationAccessSettings() {
            runOnUiThread(() -> startSystemActivity(
                    new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS),
                    "notification-access-settings", "Notification access settings are unavailable."));
        }

        @JavascriptInterface
        public void openAccessibilitySettings() {
            runOnUiThread(() -> startSystemActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS),
                    "accessibility-settings", "Accessibility settings are unavailable."));
        }

        @JavascriptInterface
        public void openBatterySettings() {
            runOnUiThread(() -> startSystemActivity(
                    new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
                    "battery-settings", "Battery settings are unavailable."));
        }

        @JavascriptInterface
        public void openAppSettings() {
            runOnUiThread(() -> startSystemActivity(new Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getPackageName())), "app-settings",
                    "App settings are unavailable."));
        }

        @JavascriptInterface
        public void shareText(String text) {
            runOnUiThread(() -> {
                String sharedText = bounded(text, MAX_SHARED_TEXT_LENGTH);
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_TEXT, sharedText);
                startSystemActivity(Intent.createChooser(send, "Share from VibeOS"), "share-text",
                        "No app is available to share text.");
                if (text != null && text.length() > MAX_SHARED_TEXT_LENGTH) {
                    Toast.makeText(MainActivity.this, "Shared text was shortened for safety.",
                            Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void copyText(String text) {
            runOnUiThread(() -> {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(
                        Context.CLIPBOARD_SERVICE);
                if (clipboard == null) {
                    reportUserError("Clipboard is unavailable.", null);
                    return;
                }
                clipboard.setPrimaryClip(ClipData.newPlainText("VibeOS",
                        bounded(text, MAX_CLIPBOARD_TEXT_LENGTH)));
                recordAction("copy-text", "");
                Toast.makeText(MainActivity.this, "Copied", Toast.LENGTH_SHORT).show();
            });
        }

        @JavascriptInterface
        public void speak(String text) {
            runOnUiThread(() -> {
                if (!ttsReady || text == null || text.trim().isEmpty()) {
                    reportUserError("Text-to-speech is not ready.", null);
                    return;
                }
                tts.speak(bounded(text, MAX_SPEECH_TEXT_LENGTH), TextToSpeech.QUEUE_FLUSH, null,
                        "vibeos-speech");
                recordAction("speak", "");
            });
        }

        @JavascriptInterface
        public void vibrate(int milliseconds) {
            int duration = Math.max(25, Math.min(milliseconds, 1500));
            runOnUiThread(() -> {
                Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator == null || !vibrator.hasVibrator()) {
                    reportUserError("Vibration is unavailable on this device.", null);
                    return;
                }
                try {
                    vibrator.vibrate(VibrationEffect.createOneShot(duration,
                            VibrationEffect.DEFAULT_AMPLITUDE));
                    recordAction("vibrate", "");
                } catch (SecurityException e) {
                    recordAction("vibrate", "permission-denied");
                    reportUserError("Vibration permission is unavailable.", e);
                }
            });
        }

        private boolean hasVibrator() {
            Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            return vibrator != null && vibrator.hasVibrator();
        }

        private int getNotificationCount(boolean notificationAccess) {
            if (!notificationAccess) return 0;
            try {
                return new JSONArray(nativePreferences().getString(
                        VibeNotificationListener.RECENT_NOTIFICATIONS, "[]")).length();
            } catch (JSONException e) {
                Log.w(TAG, "Could not count local notification context.", e);
                return 0;
            }
        }
    }
}
