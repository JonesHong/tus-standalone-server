
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'fs';
import { catchError, delay, filter, from, iif, map, mergeMap, of, pipe, retry, switchMap, tap, throwError } from 'rxjs';
import { IncomingMessage, ServerResponse } from 'http';
import { resolve } from 'path';
import _ from 'lodash';
import { FileUploadTusOptions } from 'src/types/uploader';
import { FileMetadata } from 'src/types/file-metadata';
import { v4 } from 'uuid';

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



    public tusServer

    private _payloadWithFileStruct = { "_files": [] };
    public get payloadWithFileStruct() {
        return this._payloadWithFileStruct
    }
    private _payloadWithFullPath = { "_files": [] };
    public get payloadWithFullPath() {
        return this._payloadWithFullPath
    }
    // private _serverResponse!: ServerResponse;
    private GetAllUpload = (serverResponse?: ServerResponse) => {
        // let GetPath: Map<string, any> = this.tusServer.handlers.GET.paths;
        // let ReqUrl = res.req.url;

        // console.log(this.tusServer.handlers.GET.paths, res.req.url)
        // let filePathToSave = this.mkFilePathToSave(this.DefaultFileUploadTusOptions['filePathToSave'], { "mimetype": this.DefaultFileUploadTusOptions.splitFileByMIMEType });
        let filePathToSave = this.DefaultFileUploadTusOptions['filePathToSave'];

        let payloadWithFileStruct = { "_files": [] },
            payloadWithFullPath = { "_files": [] };
        this._payloadWithFileStruct = payloadWithFileStruct;
        this._payloadWithFullPath = payloadWithFullPath;

        const GetAllFilesStruct$ = (path: string) => {
            let dirList = path.split('/').slice(2);
            return from(readdirSync(path, { "withFileTypes": true }))
                .pipe(
                    filter((Dirent) => {
                        if (Dirent.isDirectory()) {
                            if (dirList.length == 0) {
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

                            if (dirList.length == 0) {
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
                        return GetAllFilesStruct$(`${path}/${Dirent.name}`)
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
                    console.log(`GetAllUploadsList next: ${data}`);
                },
                error: error => {
                    console.log(`GetAllUploadsList error: ${error}`);
                },
                complete: () => {
                    console.log('GetAllUploadsList Done!');
                    if (!!serverResponse) {
                        serverResponse.end(JSON.stringify({ file_struct: this.payloadWithFileStruct, full_path: this.payloadWithFullPath }));
                    }
                }
            })
    }

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

        this.tusServer = new tus.Server({
            path: this.path,
            namingFunction: this.fileNameFromRequest
        });
        // console.log(this.tusServer)

        this._DefaultFileUploadTusOptions['tempFilePathToSave'] = this._DefaultFileUploadTusOptions['filePathToSave'] + '/temp';
        if (!!this.DefaultFileUploadTusOptions['isSavingFileToTemp'])
            this.tusServer.datastore = new tus.FileStore({ directory: this.DefaultFileUploadTusOptions.tempFilePathToSave });
        else
            this.tusServer.datastore = new tus.FileStore({ directory: this.DefaultFileUploadTusOptions.filePathToSave });

        of({ host: this.host, port: this.port })
            .pipe(
                delay(5),
                mergeMap(notUse => from(detect(this.port))),
                map((_port: number) => {
                    // this._host = host;
                    if (this.port == _port) {
                        console.log(`port: ${this.port} was not occupied`);
                    } else {
                        console.log(`port: ${this.port} was occupied, try port: ${_port}`);
                        this._port = _port;
                    }

                    this.tusServer.listen({ host: this.host, port: this.port }, () => {
                        console.log(`[${new Date().toLocaleTimeString()}] tus server listening at http://${this.host}:${this.port}${this.path}`);
                    });


                    this.GetAllUpload();

                    this.tusServer.get("/uploads-list", (req: IncomingMessage, res: ServerResponse) => {
                        // Read from your DataStore
                        this.GetAllUpload(res);
                    })
                }),
                tap(notUse => {
                    this.tusServer.on(tus.EVENTS.EVENT_UPLOAD_COMPLETE, (event) => {

                        let file = event['file'];
                        let metadata = this.parseUploadMetadata(event['file']['upload_metadata']);
                        let filePathToSave = this.mkFilePathToSave(this.DefaultFileUploadTusOptions['filePathToSave'], { "mimetype": metadata['type'] });

                        let source = `${this.DefaultFileUploadTusOptions['tempFilePathToSave']}/${file.id}`,
                            destination = `${filePathToSave}/${file.id}`;
                        // console.log("filePathToSave: ", filePathToSave);
                        const checkPathRetryPipe = (condition) => pipe(
                            mergeMap(notUse => {
                                return of(notUse)
                                    .pipe(
                                        switchMap(notUse => iif
                                            (condition,
                                                of(notUse),
                                                throwError(() => new Error("not exist")))),
                                        retry({ delay: 50, count: 5 })
                                    )
                            }),
                        )
                        /**
                         * FromTempToUploadsSub
                         * 1. 根據 splitFileByMIMEType決定是否創建資料夾到 ./uploads
                         * 2. 從“目標地” ./temp-uploads複製檔案到”目的地“ ./uploads/* （同上）
                         * 3. 檢查“目的地”複製的檔案是否存在
                         * 4. 如果複製成功，刪除“目標地”檔案
                         * 5. 檢查“目標地”檔案是否刪除成功
                         */
                        of(file)
                            .pipe(
                                filter(notUse => !!this.DefaultFileUploadTusOptions.isSavingFileToTemp),
                                mergeMap(notUse => of(mkdirSync(filePathToSave, { recursive: true }))),
                                mergeMap(notUse => of(copyFileSync(source, destination))),
                                checkPathRetryPipe(() => !!existsSync(destination)),
                                mergeMap(notUse => of(rmSync(source))),
                                checkPathRetryPipe(() => !!!existsSync(source)),
                                catchError(err => of(err))
                            )
                            .subscribe({
                                next: data => {
                                    console.log(`FromTempToUploadsSub next: ${data}`);
                                },
                                error: error => {
                                    console.log(`FromTempToUploadsSub error: ${error}`);
                                },
                                complete: () => {
                                    console.log('FromTempToUploadsSub Done!');
                                    this.GetAllUpload();
                                }
                            })
                        // console.log(`\n\n`)
                    });
                }),
                retry({ delay: 500, count: 10 }),
                catchError(err => {
                    // console.log(891208210, err)
                    return of(err)
                }),
            )
            .subscribe({
                next: data => {
                    console.log(`TusStandalone next: ${data}`);
                },
                error: error => {
                    console.log(`TusStandalone error: ${error}`);
                },
                complete: () => {
                    console.log('TusStandalone Done!');
                }
            })

    }
}