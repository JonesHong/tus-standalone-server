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
     If it is set to false, it will not allow the upload of files with the same name even if the content of the file is different.
 * **splitFileByMIMEType**:
     Sort the files into their respective folders according to their MIME Type.
 * **splitFileByFunctionality**:
     Sort the files into their respective folders according to their functions.

## Example

```ts
import {TusStandalone, TusRegister} from "tus-standalone-server"

let TusServer1 = new TusStandalone();
let TusServer2 = new TusStandalone({port: 3000});
let TusServer3 = new TusStandalone({ host: "127.0.0.1", port: 3333, path: "/ttttt", options: { splitFileByMIMEType: null } });
let TusServer4 = new TusStandalone({ options: { isSavingFileToTemp: true, splitFileByFunctionality: "ad", splitFileByMIMEType:null } });

console.log(TusRegister):

/** read only */
_TusRegister {
  /** What is the smallest port used randomly when the port is occupied */
  portRangeMin: 1, 
  /** What is the biggest port used randomly when the port is occupied */
  portRangeMax: 65534, 
  /** Upon using detect-port to check, it was discovered that the port is already in use. */
  OccupiedPortSet: Set(2) { 1080, 3333 },
  /** The port that is occupied after the server successfully starts. */
  ServePortSet: Set(4) { 1080, 3000, 56832, 15657 },
  ServerMap: Map(4) {
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
    'http://127.0.0.1:15657/ttttt' => TusServer {...}
  }
}
```
## Features

#### GET handler
* http://```<HOST>```:```<PORT>```/uploads-list
  You can view the list of all uploaded files through this URL, even though different servers still point to the same storage space.
  ```json
  // 20230129185413
  // http://127.0.0.1:1080/uploads-list
  
    {
        "file_struct": {
            "_files": [
                "aMVrBeut-3PJNz-m7gb3-9QTiY-2KKPQV9vS.jpg",
                "yN3zPwDk-yzQJ0-8MIEu-0reBS-6T05YKbGt.pdf"
            ],
            "ad": {
                "_files": [
                    "sAo1DGYc-BH0GU-hU59p-zQ8Oz-RzsYuvIlG.mp4"
                ]
            },
            "application": {
                "_files": [
                    "0a7985a0-570f-4c9d-a287-0a4feac813e2.pdf"
                ]
            },
            "image": {
                "_files": [
                    "431bf697-a55a-469d-bd2a-11ea85e2f573.gif"
                ]
            },
            "temp": {
                "_files": [ ]
            },
            "video": {
                "_files": [
                    "a1ad7ad0-7c79-4e64-bbae-5976fb5ce7bc.mp4"
                ]
            }
        },
        "full_path": {
            "_files": [
                "C:\\Users\\User\\Documents\\work\\uploads\\ad\\sAo1DGYc-BH0GU-hU59p-zQ8Oz-RzsYuvIlG.mp4",
                "C:\\Users\\User\\Documents\\work\\uploads\\aMVrBeut-3PJNz-m7gb3-9QTiY-2KKPQV9vS.jpg",
                "C:\\Users\\User\\Documents\\work\\uploads\\application\\0a7985a0-570f-4c9d-a287-0a4feac813e2.pdf",
                "C:\\Users\\User\\Documents\\work\\uploads\\image\\431bf697-a55a-469d-bd2a-11ea85e2f573.gif",
                "C:\\Users\\User\\Documents\\work\\uploads\\video\\a1ad7ad0-7c79-4e64-bbae-5976fb5ce7bc.mp4",
                "C:\\Users\\User\\Documents\\work\\uploads\\yN3zPwDk-yzQJ0-8MIEu-0reBS-6T05YKbGt.pdf"
            ],
            "sAo1DGYc-BH0GU-hU59p-zQ8Oz-RzsYuvIlG.mp4": "C:\\Users\\User\\Documents\\work\\uploads\\ad\\sAo1DGYc-BH0GU-hU59p-zQ8Oz-RzsYuvIlG.mp4",
            "aMVrBeut-3PJNz-m7gb3-9QTiY-2KKPQV9vS.jpg": "C:\\Users\\User\\Documents\\work\\uploads\\aMVrBeut-3PJNz-m7gb3-9QTiY-2KKPQV9vS.jpg",
            "0a7985a0-570f-4c9d-a287-0a4feac813e2.pdf": "C:\\Users\\User\\Documents\\work\\uploads\\application\\0a7985a0-570f-4c9d-a287-0a4feac813e2.pdf",
            "431bf697-a55a-469d-bd2a-11ea85e2f573.gif": "C:\\Users\\User\\Documents\\work\\uploads\\image\\431bf697-a55a-469d-bd2a-11ea85e2f573.gif",
            "a1ad7ad0-7c79-4e64-bbae-5976fb5ce7bc.mp4": "C:\\Users\\User\\Documents\\work\\uploads\\video\\a1ad7ad0-7c79-4e64-bbae-5976fb5ce7bc.mp4",
            "yN3zPwDk-yzQJ0-8MIEu-0reBS-6T05YKbGt.pdf": "C:\\Users\\User\\Documents\\work\\uploads\\yN3zPwDk-yzQJ0-8MIEu-0reBS-6T05YKbGt.pdf"
        }
    }
  ```
* http://```<HOST>```:```<PORT>```/files/```<FILENAME>```
  You can download the uploaded files according to the file name through this URL


<!-- 說明小圖示 -->
[npm-image]: https://img.shields.io/npm/v/tus-standalone-server.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/tus-standalone-server
[node-version-image]: https://img.shields.io/node/v/tus-standalone-server.svg?logo=node.js
[node-version-url]: https://nodejs.org/en/download
[downloads-image]: https://img.shields.io/npm/dm/tus-standalone-server.svg
[downloads-url]: https://npmjs.org/package/tus-standalone-server
