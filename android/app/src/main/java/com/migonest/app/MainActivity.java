package com.migonest.app;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;


public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Force the WebView background to be dark to prevent white gaps/flashes
        try {
            this.getBridge().getWebView().setBackgroundColor(Color.parseColor("#0f172a"));
            android.view.Window window = getWindow();
            androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, false);
            window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setNavigationBarColor(Color.TRANSPARENT);
            window.setStatusBarColor(Color.TRANSPARENT);
        } catch (Exception e) {
            // Fallback for safety
        }
    }
}
