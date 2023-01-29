# tus-standalone-server

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![License - MIT](https://img.shields.io/badge/License-MIT-2ea44f?logo=license)](LICENSE)

This library encapsulates the standalone server of **tus-node-server**, provides parameters to create a separate file upload server for you, and has **TusRegister** records

## Default config:
```js
{
    host: "127.0.0.1",
    port: 1080,
    path: "/files",
    options: {
        isRandomFileName: true, 
        splitFileByMIMEType: "type", 
        splitFileByFunctionality: null,
        filePathToSave: './uploads',
    }
 }  
 ```
 * **isRandomFileName**:
     If it set by false, will cause filename unique.
 * **splitFileByMIMEType**:
     It can split file to there folder by MIMEType.
 * **splitFileByFunctionality**:
     It can split file to there folder by functionality.

## Example

```ts
import {TusStandalone, TusRegister} from "tus-standalone-server"

let TusServer1 = new TusStandalone();
let TusServer2 = new TusStandalone({port: 3000});
let TusServer3 = new TusStandalone({ host: "127.0.0.1", port: 3333, path: "/ttttt", options: { splitFileByMIMEType: null } });
let TusServer4 = new TusStandalone({ options: { isSavingFileToTemp: true, splitFileByFunctionality: "ad", splitFileByMIMEType:null } });

console.log(TusRegister)
/** _TusRegister {
  _rangeMin: 1,
  _rangeMax: 65534,
  _OccupiedPortSet: Set(2) { 1080, 3333 },
  _ServePortSet: Set(4) { 1080, 3000, 56832, 15657 },
  _ServerMap: Map(4) {
    'http://127.0.0.1:1080/files' => TusServer {
      _events: [Object: null prototype],
      _eventsCount: 3,
      _maxListeners: undefined,
      options: [Object],
      handlers: [Object],
      _datastore: [FileStore],
      [Symbol(kCapture)]: false
    },
    'http://127.0.0.1:3000/files' => TusServer {
      _events: [Object: null prototype],
      _eventsCount: 3,
      _maxListeners: undefined,
      options: [Object],
      handlers: [Object],
      _datastore: [FileStore],
      [Symbol(kCapture)]: false
    },
    'http://127.0.0.1:56832/files' => TusServer {
      _events: [Object: null prototype],
      _eventsCount: 3,
      _maxListeners: undefined,
      options: [Object],
      handlers: [Object],
      _datastore: [FileStore],
      [Symbol(kCapture)]: false
    },
    'http://127.0.0.1:15657/ttttt' => TusServer {
      _events: [Object: null prototype],
      _eventsCount: 3,
      _maxListeners: undefined,
      options: [Object],
      handlers: [Object],
      _datastore: [FileStore],
      [Symbol(kCapture)]: false
    }
  }
}
*/
```


<!-- 說明小圖示 -->
[npm-image]: https://img.shields.io/npm/v/tus-standalone-server.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/tus-standalone-server
[node-version-image]: https://img.shields.io/node/v/tus-standalone-server.svg?logo=node.js
[node-version-url]: https://nodejs.org/en/download
[downloads-image]: https://img.shields.io/npm/dm/tus-standalone-server.svg
[downloads-url]: https://npmjs.org/package/tus-standalone-server
