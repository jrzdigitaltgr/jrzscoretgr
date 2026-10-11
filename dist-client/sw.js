/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "8edf2a1bb84a87ebc5a0e7c66091e45a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "b5a9c3ede599755d3b31145c4f5abc8c"
  }, {
    "url": "pwa-192x192.png",
    "revision": "50770f2dc60da73a58df50b7a5c69779"
  }, {
    "url": "logotanding.png",
    "revision": "608d5ca1df6680b284096392954517c8"
  }, {
    "url": "logomonitor2.png",
    "revision": "21bdcdb71af379cb25cf88ca283465dd"
  }, {
    "url": "logomonitor1.png",
    "revision": "b59c5a19ec3deee00e258a50412ebd74"
  }, {
    "url": "logojurus.png",
    "revision": "25e5d739c6f1095a283e8f02417d6f9e"
  }, {
    "url": "logoadministrasi.png",
    "revision": "b5d889e70a6705b0f644b5d10be81202"
  }, {
    "url": "ketuadewan.png",
    "revision": "30d4815291982d343bf49c62d58ec57a"
  }, {
    "url": "juri.png",
    "revision": "0700046e60803d1c1781a033dab11631"
  }, {
    "url": "jrzscorewatermak.png",
    "revision": "738f8a8b66b47dac6616cd2d6498ce69"
  }, {
    "url": "jrzscoreutama.png",
    "revision": "738f8a8b66b47dac6616cd2d6498ce69"
  }, {
    "url": "index.html",
    "revision": "0bad6e25930f0e7ae5bc9292cc16f38b"
  }, {
    "url": "iconmonitor.png",
    "revision": "d1958bb014102fbc67bf3615851cdd95"
  }, {
    "url": "icon.svg",
    "revision": "238be77ac0d1abfa50b4964485957b43"
  }, {
    "url": "favicon.ico",
    "revision": "05406cef2bfc2d09b679ae8bb96c22c6"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d4ca3a387b39f7211559d56180206426"
  }, {
    "url": "LogoIPSI.png",
    "revision": "f982380359825a14e350501f37b5c889"
  }, {
    "url": "Iconsekretaris.png",
    "revision": "bb4c37e32aff732112e83a34670ea7fd"
  }, {
    "url": "Iconinstalasiwindows.ico",
    "revision": "8555d08269f225655edcb8ac2b1ac6b4"
  }, {
    "url": "assets/purify.es-Csrj9YNg.js",
    "revision": null
  }, {
    "url": "assets/index.es-DewTHABN.js",
    "revision": null
  }, {
    "url": "assets/index-UM7ye1wV.css",
    "revision": null
  }, {
    "url": "assets/index-Bz4OENHz.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-QH1iLAAe.js",
    "revision": null
  }, {
    "url": "Iconsekretaris.png",
    "revision": "bb4c37e32aff732112e83a34670ea7fd"
  }, {
    "url": "LogoIPSI.png",
    "revision": "f982380359825a14e350501f37b5c889"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d4ca3a387b39f7211559d56180206426"
  }, {
    "url": "favicon.ico",
    "revision": "05406cef2bfc2d09b679ae8bb96c22c6"
  }, {
    "url": "icon.svg",
    "revision": "238be77ac0d1abfa50b4964485957b43"
  }, {
    "url": "iconmonitor.png",
    "revision": "d1958bb014102fbc67bf3615851cdd95"
  }, {
    "url": "jrzscoreutama.png",
    "revision": "738f8a8b66b47dac6616cd2d6498ce69"
  }, {
    "url": "jrzscorewatermak.png",
    "revision": "738f8a8b66b47dac6616cd2d6498ce69"
  }, {
    "url": "juri.png",
    "revision": "0700046e60803d1c1781a033dab11631"
  }, {
    "url": "ketuadewan.png",
    "revision": "30d4815291982d343bf49c62d58ec57a"
  }, {
    "url": "pwa-192x192.png",
    "revision": "50770f2dc60da73a58df50b7a5c69779"
  }, {
    "url": "pwa-512x512.png",
    "revision": "b5a9c3ede599755d3b31145c4f5abc8c"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "8edf2a1bb84a87ebc5a0e7c66091e45a"
  }, {
    "url": "manifest.webmanifest",
    "revision": "5ced0708b486d9f0e0731a7fc205a40b"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
