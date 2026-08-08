# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ================ PPS Connect · Release rules ================
# Keep Capacitor bridge classes (accessed via reflection from JS)
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.PluginMethod public *;
}
# Keep JS-Java bridge interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# WebView + WebChromeClient
-keep class android.webkit.** { *; }
-keepclassmembers class * extends android.webkit.WebView { *; }
# AndroidX splash
-keep class androidx.core.splashscreen.** { *; }
