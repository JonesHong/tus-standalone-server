
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'fs';
import { catchError, delay, filter, from, iif, map, mergeMap, of, pipe, retry, switchMap, tap, throwError, timer } from 'rxjs';
import { IncomingMessage, ServerResponse } from 'http';
import { resolve } from 'path';
import _ from 'lodash';
import { FileUploadTusOptions } from 'src/tus-standalone/uploader';
// import { FileMetadata } from 'src/tus-standalone/file-metadata';
import { v4 } from 'uuid';
import { FileMetadata } from './fileMetadata';
import { TusRegister } from './tus';

const detect = require('detect-port');
const tus = require('tus-node-server');

const EVENTS = tus.EVENTS;

export class TusStandalone {
    private _name = "TusStandalone";
    private _DefaultFileUploadTusOptions: FileUploadTusOptions = {
        isRandomFileName: true,
        splitFileByMIMEType: "type",
        filePathToSave: './uploads',
        isSavingFileToTemp: false
    };

    public get DefaultFileUploadTusOptions() {
        return this._DefaultFileUploadTusOptions
    }

    private _host: string = "127.0.0.1";
    public get host(): string {
        return this._host
    }
    private _port: number = 1080;
    public get port(): number {
        return this._port
    }
    private _path: string = "/files";
    public get path(): string {
        return this._path
    }


    private mkFilePathToSave = (filePathToSave: string, { mimetype }: { mimetype?: string, functionality?: string }) => {


        let splitFileByMIMEType = this.DefaultFileUploadTusOptions['splitFileByMIMEType'];
        if (!!filePathToSave.includes("temp")) {
            splitFileByMIMEType = null;
            filePathToSave = this.DefaultFileUploadTusOptions['tempFilePathToSave'];

            new tus.FileStore({ directory: filePathToSave });
            this.tusServer.datastore.directory = filePathToSave;
        }
        // else {
        //     !!functionality ? filePathToSave += `/${functionality}` : null;
        // }
        !!this.DefaultFileUploadTusOptions.splitFileByFunctionality ? filePathToSave += `/${this.DefaultFileUploadTusOptions.splitFileByFunctionality}` : null;

        // e.g. splitFileByMIMEType = 'video/mp4';
        switch (splitFileByMIMEType) {
            case null: {

            }
                break;
            case 'type': {
                // e.g. filePathToSave = "./uploads/video";  
                if (!!!mimetype) console.error("mimetype in mkFilePathToSave is missing");
                let type = mimetype.split("/")[0];
                filePathToSave += `/${type}`;
            } break;
            case 'MIMEType': {
                // e.g. filePathToSave = "./uploads/video/mp4";
                if (!!!mimetype) console.error("mimetype in mkFilePathToSave is missing");
                filePathToSave += `/${mimetype}`;
            } break;
            default:
                break;
        }

        if (splitFileByMIMEType !== null) {
            new tus.FileStore({ directory: filePathToSave });
            this.tusServer.datastore.directory = filePathToSave;
        }

        return filePathToSave
    }

    private fileNameFromRequest = (req) => {
        // let fileName;
        const metadata = this.getFileMetadata(req);

        const prefix: string = v4();

        const fileName = metadata.extension ? prefix + '.' + metadata.extension : prefix;

        return fileName;
    }

    private getFileMetadata = (req: any): FileMetadata => {

        const uploadMeta = req.rawHeaders.reduce((acc, curr) => {
            if (!!acc['isAllowed']) {
                acc = {
                    "isAllowed": false,
                    payload: curr
                }
            }
            if (curr == "Upload-Metadata") acc['isAllowed'] = true;
            return acc
        }, { isAllowed: false, payload: null })['payload'];
        const metadata = this.parseUploadMetadata(uploadMeta);

        let extension: string = (metadata.name) ? metadata.name.split('.').pop() : null;
        extension = extension && extension.length === 3 ? extension : null;
        metadata.extension = extension;
        if (!!this.DefaultFileUploadTusOptions['isSavingFileToTemp'])
            this.mkFilePathToSave(this.DefaultFileUploadTusOptions['tempFilePathToSave'], { "mimetype": metadata['type'] })
        else
            this.mkFilePathToSave(this.DefaultFileUploadTusOptions['filePathToSave'], { "mimetype": metadata['type'] })

        return metadata;
    }
    private parseUploadMetadata = (uploadMeta: string) => {
        const metadata = new FileMetadata();

        uploadMeta.split(',').map(item => {
            const tmp = item.split(' ');
            const key = tmp[0];
            const value = Buffer.from(tmp[1], 'base64').toString('ascii');;
            metadata[`${key}`] = value;
        });
        return metadata;
    }


    private _tusServer
    public get tusServer() {
        return this._tusServer
    }
    private _payloadWithFileStruct = { "_files": [] };
    public get payloadWithFileStruct() {
        return this._payloadWithFileStruct
    }
    private _payloadWithFullPath = { "_files": [] };
    public get payloadWithFullPath() {
        return this._payloadWithFullPath
    }

    private GetAllUpload = (serverResponse?: ServerResponse) => {
        let GetPath: Map<string, any> = this.tusServer.handlers.GET.paths;
        // let ReqUrl = res.req.url;
        // console.log(this.tusServer.handlers.GET.paths, res.req.url)
        // let filePathToSave = this.mkFilePathToSave(this.DefaultFileUploadTusOptions['filePathToSave'], { "mimetype": this.DefaultFileUploadTusOptions.splitFileByMIMEType });
        let filePathToSave = this.DefaultFileUploadTusOptions['filePathToSave'];
        // console.log(this.port, filePathToSave, this.DefaultFileUploadTusOptions)

        let payloadWithFileStruct = { "_files": [] },
            payloadWithFullPath = { "_files": [] };
        this._payloadWithFileStruct = payloadWithFileStruct;
        this._payloadWithFullPath = payloadWithFullPath;

        const GetAllFilesStruct$ = (path: string, dirLevelCount = 0) => {
            let dirList = path.split('/').slice(2);
            return from(readdirSync(path, { "withFileTypes": true }))
                .pipe(
                    filter((Dirent) => {
                        if (Dirent.isDirectory()) {
                            if (dirLevelCount == 0 || dirList.length == 0) {
                                if (!!!this.payloadWithFileStruct[Dirent.name]) this.payloadWithFileStruct[Dirent.name] = { _files: [] };
                            } else {
                                const recursiveMakeFolder = (pointer = this.payloadWithFileStruct, count = 0) => {
                                    let dir = dirList[count];
                                    if (dirList.length - 1 !== count) {
                                        count += 1;
                                        recursiveMakeFolder(pointer[dir], count)
                                    } else {
                                        if (!!!pointer[dir][Dirent.name]) pointer[dir][Dirent.name] = { _files: [] };
                                    }
                                }
                                recursiveMakeFolder();
                            }
                        }
                        else if (Dirent.isFile()) {
                            let fileFullPath = resolve(path, Dirent.name);
                            this.payloadWithFullPath['_files'].push(fileFullPath)
                            this.payloadWithFullPath[Dirent.name] = fileFullPath;
                            this.tusServer.get(`/files/${Dirent.name}`, (req, res: ServerResponse) => {
                                let fileBuffer = readFileSync(fileFullPath);
                                res.end(fileBuffer)
                            })

                            if (dirLevelCount == 0 || dirList.length == 0) {
                                if (!!!this.payloadWithFileStruct['_files']) this.payloadWithFileStruct['_files'] = [];
                                this.payloadWithFileStruct['_files'].push(Dirent.name)
                            } else {

                                const recursivePushFiles = (pointer = this.payloadWithFileStruct, count = 0) => {
                                    let dir = dirList[count];
                                    if (dirList.length - 1 !== count) {
                                        count += 1;
                                        recursivePushFiles(pointer[dir], count)
                                    } else {
                                        pointer[dir]['_files'].push(Dirent.name);
                                    }
                                }
                                recursivePushFiles();
                            }
                        }
                        return Dirent.isDirectory()
                    }),
                    mergeMap(Dirent => {
                        dirLevelCount += 1
                        return GetAllFilesStruct$(`${path}/${Dirent.name}`, dirLevelCount)
                    }),
                    catchError(err => of(err))
                )
        };

        of(filePathToSave)
            .pipe(
                // filter(notUse=> this.DefaultFileUploadTusOptions['isSharedFile']),
                mergeMap((notUse) => GetAllFilesStruct$(filePathToSave)),
            )
            .subscribe({
                next: data => {
                    // console.log(`GetAllUploadsList next: ${data}`);
                },
                error: error => {
                    console.log(`GetAllUploadsList error: ${error}`);
                },
                complete: () => {
                    // console.log('GetAllUploadsList Done!');
                    if (!!serverResponse) {
                        serverResponse.end(JSON.stringify({ file_struct: this.payloadWithFileStruct, full_path: this.payloadWithFullPath }));
                    }
                }
            })
    }


    newRandomPort!: number;
    getNewRandomPort = () => { this.newRandomPort = Math.floor(Math.random() * (TusRegister.portRangeMax - TusRegister.portRangeMin + 1) + TusRegister.portRangeMin); return this.newRandomPort };
    constructor(datas?: { host?: string, port?: number, path?: string, options?: FileUploadTusOptions }) {
        if (!!datas?.host) this._host = datas.host;
        if (!!datas?.port) this._port = datas.port;
        if (!!datas?.path) this._path = datas.path;
        if (!!datas?.options) {
            this._DefaultFileUploadTusOptions = {
                ...this._DefaultFileUploadTusOptions,
                ...datas.options
            }
        }

        this._tusServer = new tus.Server({
            path: this.path,
            namingFunction: this.fileNameFromRequest
        });

        this._DefaultFileUploadTusOptions['tempFilePathToSave'] = this._DefaultFileUploadTusOptions['filePathToSave'] + '/temp';
        if (!!this.DefaultFileUploadTusOptions['isSavingFileToTemp'])
            this.tusServer.datastore = new tus.FileStore({ directory: this.DefaultFileUploadTusOptions.tempFilePathToSave });
        else
            this.tusServer.datastore = new tus.FileStore({ directory: this.DefaultFileUploadTusOptions.filePathToSave });

        process.on('uncaughtException', (error) => {
            let errorStr = String(error)
            // 其他处理机制
            if (errorStr.match(/listen EACCES: permission denied/) ||
                errorStr.match(/listen EADDRINUSE: address already in use/)) {
                let lastColonIndex = errorStr.lastIndexOf(":"),
                    portInString = errorStr.slice(lastColonIndex + 1);
                if (this.port == Number(portInString)) {
                    TusRegister.OccupiedPortSet.add(this.port);
                    TusRegister.ServePortSet.delete(this.port)
                    this.getNewRandomPort();
                    this._port = this.newRandomPort;
                    TusRegister.isPrintDetail ? null : console.log(`${errorStr}, retry with port `);
                    this.serverInitCount += 1;
                    this.initializeTusServer();
                }
            }
        })
        this.initializeTusServer();
    }

    serverInitCount = 0;
    initializeTusServer() {
        const DetectPort = (portToDetect = this.port, detectPortCount = 0) => {
            let randomSec = Math.floor(Math.random() * (500 - 200 + 1) + 200);
            TusRegister.isPrintDetail ? null : console.log(`[RetryCount] \n{detectPortCount: ${detectPortCount}, serverInitCount:${this.serverInitCount}}`);
            return of({})
                .pipe(
                    delay(randomSec),  // delay every times
                    mergeMap(() => from(detect(portToDetect))),
                    switchMap((_port) => {

                        return iif(
                            () => {
                                let condition = portToDetect == _port && // 預測的 port與 檢查的 port若是相等意思就是無佔用
                                    !TusRegister.ServePortSet.has(portToDetect) && // Sever若是已經被 listen則為占用
                                    !TusRegister.OccupiedPortSet.has(portToDetect) && // 透過 detect-port檢查過已被占用的 port
                                    detectPortCount <= 20 && // retry detectPort 20 times
                                    this.serverInitCount <= 10; // retry detectPort 10 times

                                if (condition) {
                                    TusRegister.isPrintDetail ? null : console.log(`port: ${portToDetect} was not occupied`);
                                }
                                else {
                                    TusRegister.OccupiedPortSet.add(portToDetect);
                                    this.getNewRandomPort();
                                    TusRegister.isPrintDetail ? null : console.log(`port: ${portToDetect} was occupied, try port: ${this.newRandomPort}`);
                                    this._port = this.newRandomPort;
                                }

                                return condition;
                            },
                            of(_port) // not occupied
                                .pipe(
                                    tap(() => {
                                        try {
                                            this.tusServer.listen({ host: this.host, port: this.port }, () => {
                                                TusRegister.ServePortSet.add(this.port);
                                                TusRegister.ServerMap.set(`http://${this.host}:${this.port}${this.path}`, this.tusServer)
                                                console.log(`[${new Date().toLocaleTimeString()}] tus server listening at http://${this.host}:${this.port}${this.path}`);
                                            });
                                        } catch (error) {
                                            return throwError(() => error)
                                        }
                                        this.GetAllUpload();

                                        this.tusServer.get("/uploads-list", (req: IncomingMessage, res: ServerResponse) => {
                                            // Read from your DataStore
                                            this.GetAllUpload(res);

                                        })
                                    })
                                ),
                            of({}).pipe(
                                mergeMap => {
                                    detectPortCount += 1;
                                    return DetectPort(this.newRandomPort, detectPortCount)
                                }
                            )  // occupied, try port:
                        )
                    }),
                    retry({
                        delay: (err, count) => {
                            let randomSec = Math.floor(Math.random() * (500 - 200 + 1) + 200);
                            TusRegister.isPrintDetail ? null : console.log('RetryCount: ', count, '\n', err);
                            return timer(randomSec)
                        },
                        count: 10
                    }),
                    catchError(err => {
                        // console.log("DetectPort.catchError", err)
                        return of(err)
                    }),
                )
        };

        of({})
            .pipe(
                delay(50), // delay for other server
                mergeMap(() => DetectPort(this.port)),
                // delay(3000),
                tap(() => {

                    this.tusServer.on(tus.EVENTS.EVENT_UPLOAD_COMPLETE, (event) => {

                        let file = event['file'];
                        let metadata = this.parseUploadMetadata(event['file']['upload_metadata']);
                        let filePathToSave = this.mkFilePathToSave(this.DefaultFileUploadTusOptions['filePathToSave'], { "mimetype": metadata['type'] });

                        let source = `${this.DefaultFileUploadTusOptions['tempFilePathToSave']}/${file.id}`,
                            destination = `${filePathToSave}/${file.id}`;

                        const checkPathRetryPipe = (condition) => pipe(
                            mergeMap(() => {
                                return of({})
                                    .pipe(
                                        switchMap(() => iif
                                            (condition,
                                                of({}),
                                                throwError(() => new Error("not exist")))),
                                        retry({ delay: 50, count: 5 })
                                    )
                            }),
                        )
                        /**
                         * 1. 根據 splitFileByMIMEType決定是否創建資料夾到 ./uploads
                         * 2. 從“目標地” ./temp-uploads複製檔案到”目的地“ ./uploads/* （同上）
                         * 3. 檢查“目的地”複製的檔案是否存在
                         * 4. 如果複製成功，刪除“目標地”檔案
                         * 5. 檢查“目標地”檔案是否刪除成功
                         */
                        const FromTempToUploadsSub = of(file)
                            .pipe(
                                filter(() => !!this.DefaultFileUploadTusOptions.isSavingFileToTemp),
                                mergeMap(() => of(mkdirSync(filePathToSave, { recursive: true }))),
                                mergeMap(() => of(copyFileSync(source, destination))),
                                checkPathRetryPipe(() => !!existsSync(destination)),
                                mergeMap(() => of(rmSync(source))),
                                checkPathRetryPipe(() => !!!existsSync(source)),
                                catchError(err => of(err))
                            )
                            .subscribe({
                                next: data => {
                                    // console.log(`FromTempToUploadsSub next: ${data}`);
                                },
                                error: error => {
                                    console.log(`FromTempToUploadsSub error: ${error}`);
                                },
                                complete: () => {
                                    // console.log('FromTempToUploadsSub Done!');
                                    this.GetAllUpload();
                                }
                            })
                        // console.log(`\n\n`)
                    });
                }),
                catchError(err => {
                    return of(err)
                }),

            )
            .subscribe({
                next: data => {
                    // console.log(`TusStandalone next: ${data}`);
                },
                error: error => {
                    console.log(`TusStandalone error: ${error}`);
                },
                complete: () => {
                    // console.log('TusStandalone Done!');
                }
            })
    }
}
