/**
 * Google AdMob / Native Bridge Integration Helper
 * 
 * When wrapping RideFlow inside an Android App (either WebView or standard Trusted Web Activity / Custom Tab),
 * you can register a JavascriptInterface named 'Android' on the Android side.
 * 
 * Example Java/Kotlin implementation in Android WebView:
 *  class WebAppInterface(private val mContext: Context) {
 *      @JavascriptInterface
 *      fun showBannerAd() { ... }
 *      @JavascriptInterface
 *      fun showInterstitialAd() { ... }
 *  }
 *  webView.addJavascriptInterface(WebAppInterface(this), "Android")
 */

interface CustomWindow extends Window {
  Android?: {
    showBannerAd?: () => void;
    showInterstitialAd?: () => void;
    loadAdMobBanner?: (elementId: string) => void;
  };
}

const customWindow = window as unknown as CustomWindow;

export const AdMobBridge = {
  /**
   * Triggers a native interstitial ad if the native bridge is registered.
   */
  showInterstitial(): void {
    console.log("[AdMobBridge] Attempting to show interstitial...");
    if (customWindow.Android && typeof customWindow.Android.showInterstitialAd === 'function') {
      try {
        customWindow.Android.showInterstitialAd();
      } catch (error) {
        console.error("[AdMobBridge] Error showing interstitial:", error);
      }
    } else {
      console.warn("[AdMobBridge] Native 'Android' bridge or Interstitial interface not found.");
    }
  },

  /**
   * Triggers a native banner ad if the native bridge is registered.
   */
  showBanner(): void {
    console.log("[AdMobBridge] Attempting to show banner...");
    if (customWindow.Android && typeof customWindow.Android.showBannerAd === 'function') {
      try {
        customWindow.Android.showBannerAd();
      } catch (error) {
        console.error("[AdMobBridge] Error showing banner:", error);
      }
    } else {
      console.warn("[AdMobBridge] Native 'Android' bridge or Banner interface not found.");
    }
  },

  /**
   * Binds AdSense / Web-based AdMob code to a container if web ads are configured.
   */
  loadWebAd(containerId: string): void {
    console.log(`[AdMobBridge] Loading web-fallback ad in #${containerId}`);
    if (customWindow.Android && typeof customWindow.Android.loadAdMobBanner === 'function') {
      try {
        customWindow.Android.loadAdMobBanner(containerId);
      } catch (error) {
        console.error("[AdMobBridge] Native loadAdMobBanner error:", error);
      }
    }
  }
};
