[app]
title = Matematicas JCM
package.name = mathgame
package.domain = org.jcm.miapp

[buildozer]
log_level = 2

[app]
source.dir = .
source.include_exts = py,png,jpg,kv,atlas
version = 0.1
requirements = python3,kivy
presplash.filename = %(source.dir)s/presplash.png
icon.filename = %(source.dir)s/icon.png

# Android specific
android.api = 30
android.minapi = 21
android.ndk = 25b
android.sdk = 33