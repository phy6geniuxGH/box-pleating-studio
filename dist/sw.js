importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.0.2/workbox-sw.js");const{strategies:strategies,routing:routing,googleAnalytics:googleAnalytics,broadcastUpdate:broadcastUpdate,precaching:precaching}=workbox;googleAnalytics.initialize();let defaultHandler=new strategies.StaleWhileRevalidate({cacheName:"assets",plugins:[new broadcastUpdate.BroadcastUpdatePlugin({generatePayload:e=>({path:new URL(e.request.url).pathname})})]});routing.setDefaultHandler(defaultHandler);const precacheController=new precaching.PrecacheController({cacheName:"assets"});precacheController.addToCacheList([{url:"donate.htm",revision:"e3710edca72642e95208c3b9d55c8c50"},{url:"index.htm",revision:"390f986da33fd419a910117d4c89bc77"},{url:"bpstudio.js",revision:"108af6dc78fe1f3bd452b0314e894211"},{url:"donate.js",revision:"f2d9a42ebc0e8334a2ac9d07a0cf4b50"},{url:"lib/bootstrap/bootstrap.min.js",revision:"43748e85920c4fbd9cdbc7ca516b3e30"},{url:"lib/bootstrap/popper.min.js",revision:"32794b0c01ca82203ffa97e580d4ef5c"},{url:"lib/clickout-event.js",revision:"098a254fce051cb5a0f1b1b5f7b8b74e"},{url:"lib/jszip.min.js",revision:"11baf76eea8c783234b22bdce63aa7a9"},{url:"lib/lzma_worker-min.js",revision:"522bc8c23346ddf54992d531acabcb3e"},{url:"lib/marked.min.js",revision:"bbd9c658d45aaf70666485ef834d9d19"},{url:"lib/paper-core.min.js",revision:"63f5801f0d4cd5ed107085ac6b4ce532"},{url:"lib/paper-master.js",revision:"cb13a18d662bac5eb37457b03dc112de"},{url:"lib/paper-worker.js",revision:"c944ecb1331d15870a401e7dca77c671"},{url:"lib/sortable.min.js",revision:"db61fae4ce93e28e89e8710eb275fe3c"},{url:"lib/vue-clipboard.min.js",revision:"7ed42cdcf96b7af11366d227331880c4"},{url:"lib/vue-i18n.js",revision:"2730c39eb8ceb1660ad70b94b7052d07"},{url:"lib/vue.runtime.min.js",revision:"80cb121dd45a5b6b11f9345af205dc0e"},{url:"lib/vuedraggable.umd.min.js",revision:"4f38b11a5046baa0b1e5b7d994e7052d"},{url:"locale.js",revision:"9ad9ef7597c40ba6e5ee349fdf6ed487"},{url:"log/log.js",revision:"6406298a1cafc3ef69980db70d5f1fed"},{url:"main.js",revision:"dffa007616fd0c9aebdbb87aff3b71bc"},{url:"shrewd.min.js",revision:"988dc140e087ff6131e2e88479005b4f"},{url:"assets/bps/style.css",revision:"0a5da4205e5b71dbddb06e92b277f320"},{url:"lib/bootstrap/bootstrap.min.css",revision:"521fa9a766c38b040b33e50afcca616b"},{url:"lib/font-awesome/css/all.min.css",revision:"84d8ad2b4fcdc0f0c58247e778133b3a"},{url:"main.css",revision:"463c6f1684299012c91ff1deac504766"},{url:"assets/bps/fonts/bps.woff2",revision:"9d31a5529d268b9a77838f90bfdc800a"},{url:"lib/font-awesome/webfonts/fa-brands-400.woff2",revision:"cac68c831145804808381a7032fdc7c2"},{url:"lib/font-awesome/webfonts/fa-regular-400.woff2",revision:"3a3398a6ef60fc64eacf45665958342e"},{url:"lib/font-awesome/webfonts/fa-solid-900.woff2",revision:"c500da19d776384ba69573ae6fe274e7"},{url:"manifest.json",revision:"17acf8568b0e6bb8a6c25af07c7290ef"},{url:"assets/icon/icon-32.png",revision:"e3373fcd5a66b341b6c9c6d9d6283a23"},{url:"assets/icon/icon-192.png",revision:"e9085f6760d9bb625882c85bef6fd16f"},{url:"log/20210301.md",revision:"c58a2f584d26788dcb672939f1e8835d"}]);const precacheRoute=new precaching.PrecacheRoute(precacheController,{ignoreURLParametersMatching:[/.*/],directoryIndex:"index.htm",cleanURLs:!1});routing.registerRoute(precacheRoute),caches.delete("versioned"),routing.registerRoute((({url:e})=>e.pathname.endsWith(".md")),new strategies.NetworkFirst({fetchOptions:{cache:"reload"},cacheName:"assets"}));let netOnly=new strategies.NetworkOnly({fetchOptions:{cache:"reload"}});async function message(e){if(e.ports[0]&&"id"==e.data){let a=await self.clients.matchAll({type:"window"}),s=Number.POSITIVE_INFINITY;for(let i of a)if(i.id!=e.source.id){let e=await callClient(i,"id");e<s&&(s=e)}e.ports[0].postMessage(s)}}function callClient(e,a){return new Promise((s=>{let i=new MessageChannel;i.port1.onmessage=e=>s(e.data),e.postMessage(a,[i.port2])}))}routing.registerRoute((({url:e})=>"tinyurl.com"==e.host),netOnly),routing.registerRoute((({request:e})=>"POST"==e.method),netOnly,"POST"),self.addEventListener("install",(e=>{skipWaiting(),console.log("service worker installing"),precacheController.install(e)})),self.addEventListener("activate",(e=>{precacheController.activate(e)})),self.addEventListener("message",(e=>{e.waitUntil(message(e))}));