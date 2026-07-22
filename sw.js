'use strict';
var CACHE='so-tay-ca-phuong-v13-4-20260721';
var CORE=[
  './','./index.html','./manifest.webmanifest','./version.json','./v13_4.css','./v13_4.js',
  './assets/image_01_fb2164d4c4.png','./assets/image_02_cb1879fb48.png',
  './assets/image_03_f45d1b284f.svg','./assets/image_04_c014c16aa5.svg',
  './assets/image_05_fbe3e15a43.svg','./assets/image_06_2a1cb1950c.svg',
  './assets/image_07_43a42b5b76.svg','./assets/image_08_8d6be99da7.png'
];
self.addEventListener('install',function(event){event.waitUntil(caches.open(CACHE).then(function(cache){return cache.addAll(CORE);}).then(function(){return self.skipWaiting();}));});
self.addEventListener('activate',function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(key){return key!==CACHE;}).map(function(key){return caches.delete(key);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(event){
  var request=event.request;if(request.method!=='GET')return;
  var url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(function(response){var copy=response.clone();caches.open(CACHE).then(function(cache){cache.put('./index.html',copy);});return response;}).catch(function(){return caches.match('./index.html');}));return;
  }
  event.respondWith(caches.match(request).then(function(hit){return hit||fetch(request).then(function(response){if(response&&response.ok){var copy=response.clone();caches.open(CACHE).then(function(cache){cache.put(request,copy);});}return response;});}));
});
self.addEventListener('message',function(event){if(event.data==='SKIP_WAITING')self.skipWaiting();});
