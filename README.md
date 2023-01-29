# tus-standalone-server



Default config:
{
    host: "127.0.0.1",
    port: 1080,
    path: "/files",
    options: {
        isRandomFileName: true, 
        splitFileByMIMEType: "type", 
        splitFileByFunctionality: null,
        filePathToSave: './uploads',
        isSavingFileToTemp: false
    }
 }  
 
 * isRandomFileName: If it set by false, will cause filename unique.
 * splitFileByMIMEType: It can split file to there folder by MIMEType.
 * splitFileByFunctionality: It can split file to there folder by functionality.
 * isSavingFileToTemp: 


```ts
let TusServer1 = new TusStandalone();
let TusServer2 = new TusStandalone({port: 3000});
let TusServer3 = new TusStandalone({ host: "127.0.0.1", port: 3333, path: "/ttttt", options: { splitFileByMIMEType: null } });
let TusServer4 = new TusStandalone({ options: { isSavingFileToTemp: true, splitFileByFunctionality: "ad", splitFileByMIMEType:null } });

console.log(
    TusRegister
)
```