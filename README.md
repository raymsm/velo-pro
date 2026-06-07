# RideFlow: Pro Bike Companion (Android & Play Store Ready)

RideFlow is an ultra-fast, professional telemetry and economy application for bike enthusiasts. Fully prepared for Google Play Store packaging via Bubblewrap/TWA (Trusted Web Activity) or standard WebViews, and completely privacy-focused with modular offline capabilities.

---

## 📱 Google Play Store Ready Features
- **Asset Link Support**: Fully supports `assetlinks.json` for Android App Verification.
- **W3C Compliant Web Manifest**: Standardised orientations (`portrait`), scopes, theme configurations, and multiple icon sizes (192px / 512px) configured for smooth Bubblewrap bundling.
- **Offline Reliability Service Worker**: Native `sw.js` registration built-in for fast asset caching, fulfilling Google Play's required offline support verification.
- **Google AdMob Native Bridge**: Integrated `AdMobBridge` allows any native Java/Kotlin Android container to trigger Ads seamlessly via Javascript interface injection.

---

## 📊 Core Telemetry Features
- **Active Ride Tracking**: Live location telemetry, distance calculations, and real-time path visualisations using high-performance mapping.
- **Dashboard Logs**: Track life vehicle odometer, average economy, and fuel consumption stats.
- **Expense tracking**: Log fuel additions alongside costs, maintaining an efficient ride budget.
- **Destination & Route Planner**: Built-in coordinates search with multi-waypoint support.
- **Local JSON Export/Import**: Secure, local file-based backing for physical data backups and restorations without requiring forced remote clouds.

---

## 🚀 Building & Packaging for Android (Bubblewrap CLI)

To turn RideFlow into a `.apk` or `.aab` (Android App Bundle) ready for the Google Play Store, you can use Google's official **Bubblewrap CLI**:

### 1. Prerequisite Installations
Ensure you have the latest Node.js, JDK (Java Development Kit 17+), and Gradle installed, then install Bubblewrap:
```bash
npm install -g @bubblewrap/cli
```

### 2. Initialize the Android Project
Bubblewrap automatically reads your compliant manifest and sets up the Native TWA Android App:
```bash
bubblewrap init --manifest=https://your-deployed-domain.com/manifest.json
```
- Specify details like your target package name (e.g., `com.rideflow.probikecompanion`).
- Specify local directories for SDKs and signing credentials.

### 3. Generate Android Signing Key & Compile
If you don't have a keystore, Bubblewrap can generate one for you during the workflow:
```bash
bubblewrap build
```
This produces an optimized, Google Play-ready signed **Release `.aab` bundle** or debug `.apk` files inside the build outputs directory.

---

## 💵 Configured for Google AdMob

The codebase is structured to support **Google AdMob**. In `/src/lib/admob.ts`, we expose:
- `AdMobBridge.showInterstitial()` — prompts an interstitial ad on native devices.
- `AdMobBridge.showBanner()` — prompts a banner ad.

### Native Kotlin Android Integration (Example)
To wire up native ads to our Javascript bridge, expose a `JavascriptInterface` on your webview class:
```kotlin
import android.content.Context
import android.webkit.JavascriptInterface

class WebAppInterface(private val mContext: Context) {
    @JavascriptInterface
    fun showInterstitialAd() {
        // Native code to load/show Google AdMob Interstitial Ad here
    }
    
    @JavascriptInterface
    fun showBannerAd() {
        // Native code to trigger Google AdMob Banner view here
    }
}

// Bind to your WebView:
webView.addJavascriptInterface(WebAppInterface(this), "Android")
```

---

## 🛠️ Getting Started Locally

### Prerequisites
- Node.js (v18+)
- npm

### Setup & Run
1. Install client dependencies:
   ```bash
   npm install
   ```
2. Run development platform:
   ```bash
   npm run dev
   ```

---

## ⚡ Cloudflare Pages & Workers Deployment Guide

Because RideFlow is a client-centric single-page app (SPA) with serverless capabilities, it is **100% ready to be hosted under Cloudflare Pages with Cloudflare Workers/Functions** for maximum speed, security, and response times.

### 1. Push Code to GitHub
1. Create a new, blank repository in GitHub (e.g., `rideflow-pro`).
2. Locally initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initialize RideFlow"
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/rideflow-pro.git
   git push -u origin main
   ```

### 2. Connect to Cloudflare Pages
1. Log into your **Cloudflare Dashboard**.
2. Navigate to **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
3. Select your GitHub repository (`rideflow-pro`).
4. In the **Build settings**, configure:
   - **Framework Preset**: `Vite` (or `None`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **Save and Deploy**.

Cloudflare will automatically build the React SPA into static assets and detect the serverless `/functions/api/weather.js` file, compiling it into a high-performance **Cloudflare Page Function**.

### 3. Add Your Custom Domain
1. In Cloudflare, navigate to your newly deployed Pages project.
2. Select the **Custom domains** tab.
3. Click **Set up a custom domain** and enter your domain name (e.g., `rideflow.yourdomain.com`).
4. Cloudflare will automatically handle the DNS routing and provision dual SSL certificates.

---

## 🤖 AI-Assisted Development Acknowledgement

This application was proudly developed utilizing **AI-assisted development tools and workflows**. Generative AI models were active partners throughout the engineering lifecycle, assisting with state modeling, visual telemetry layout sketches, service integration patterns, and unit mappings. 

This cooperative development process was paired with **careful monitoring, auditing, and fine-tuning** carried out by the engineer at every step to ensure high performance, code-quality standards, security verification, and a meticulous, highly polished final layout.

---

## 📄 License

This project is licensed under the **Apache License 2.0**. 

```text
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
