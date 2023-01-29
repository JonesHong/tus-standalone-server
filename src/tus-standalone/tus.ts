
function Singleton(target: any) {
    target.getInstance = function (args?: any) {
        if (!target.instance) {
            target.instance = new target(args);
        }
        return target.instance;
    }
}

@Singleton
class _TusRegister {
    private static instance: _TusRegister;
    static getInstance: () => _TusRegister;
    private constructor() { }

    // 不提供修正，怕被複寫
    private _portRangeMin = 0 + 1; // 最小 port
    private _portRangeMax = 65535 - 1; // 最大 port
    private _OccupiedPortSet = new Set(); // 由 detect-port檢查到占用的 port
    private _ServePortSet = new Set(); // Tus server listen以後來註冊使用的 port
    private _ServerMap = new Map(); // 由 host+port作為 key，tus server作為 value
    private _isPrintDetail = false;


    public get portRangeMin() {
        return this._portRangeMin
    }
    public get portRangeMax() {
        return this._portRangeMax
    }
    public get OccupiedPortSet() {
        return this._OccupiedPortSet
    }
    public get ServePortSet() {
        return this._ServePortSet
    }
    public get ServerMap() {
        return this._ServerMap
    }
    public get isPrintDetail() {
        return this._isPrintDetail
    }

}


export const TusRegister = _TusRegister.getInstance();


