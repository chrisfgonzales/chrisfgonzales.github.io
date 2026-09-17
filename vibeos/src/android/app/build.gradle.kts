plugins { id("com.android.application") }

val webSourceDir = rootProject.projectDir.parentFile.resolve("web")
val webAssetsDir = layout.projectDirectory.dir("src/main/assets/www")

android {
    namespace = "com.dotmatrixsolutions.vibeos"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.dotmatrixsolutions.vibeos"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    tasks.register<Copy>("syncWebAssets") {
        from(webSourceDir)
        include("app.js", "icon.svg", "index.html", "manifest.webmanifest", "privacy.html", "styles.css", "sw.js")
        into(webAssetsDir)
    }

    tasks.named("preBuild") {
        dependsOn("syncWebAssets")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.17.0")
}
