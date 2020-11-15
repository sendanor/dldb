import HttpUtils, {HttpMethod} from "./HttpUtils";
import {IncomingMessage, ServerResponse} from "http";
import RoutePath from "./RoutePath";
import StringUtils from "./StringUtils";
import {
    DLDB_INCOMING_SECRET,
    DLDB_MINIMUM_NETWORK_DELAY,
    DLDB_NODES,
    DLDB_PUBLIC_URL,
    DLDB_SEND_DELAY
} from "./Environment";
import {ObjectUtils} from "./ObjectUtils";

export enum DataRequestLevel {

    READ_ACCESS,

    WRITE_ACCESS

}

export interface GetQueueObject {

    res: ServerResponse;

}

export interface PostQueueObject extends GetQueueObject {

    input: Record<string, any>;

}

export enum DLDBResponseStatus {

    OK = 'OK',

    ERROR = 'ERROR'

}

export interface DLDBIncomingDataObject {

    readonly secret  : string;

    readonly from    : string;

    /**
     * If this is READ_ACCESS, the node may handle read operations, but must not pass it on to the next node.
     *
     * If this is WRITE_ACCESS, the node should handle write operations and pass it on to next node.
     */
    readonly level   : DataRequestLevel;

    readonly payload : Record<string, any>;

}

export interface DLDBIncomingDataRequestObject {

    readonly from    : string;

    readonly level   : DataRequestLevel;

}

export class DLDBServer {

    private _serverStateOk : boolean;

    private readonly _getQueue  : Array<GetQueueObject>;

    private readonly _postQueue : Array<PostQueueObject>;

    private readonly _nodeDataRequestLevels : Record<string, DataRequestLevel>;
    private readonly _nodeAverageSpeed      : Record<string, number>;
    private readonly _nodeAverageSampleSize : Record<string, number>;

    constructor () {

        this._serverStateOk = true;

        this._getQueue  = [];

        this._postQueue = [];

        this._nodeDataRequestLevels = {};

        this._nodeAverageSpeed = {};
        this._nodeAverageSampleSize = {};

    }

    private static _parseDataRequestLevel (value: number) : DataRequestLevel | undefined {

        switch(value) {
            case 0: return DataRequestLevel.READ_ACCESS;
            case 1: return DataRequestLevel.WRITE_ACCESS;
        }

        return undefined;

    }

    private static _isIncomingDataObject (data: Record<string, any>) : data is DLDBIncomingDataObject {

        const from = data?.from;

        const secret = data?.secret;

        const payload = data?.payload;

        const level = this._parseDataRequestLevel(data?.level);

        return !!(
            secret && payload && typeof secret === 'string'
            && from && typeof from === 'string'
            && typeof payload === 'object' && !(payload instanceof Array)
            && level !== undefined && typeof level === 'number'
        );

    }

    private static _isIncomingDataRequestObject (data: Record<string, any>) : data is DLDBIncomingDataRequestObject {

        const from = data?.from;

        const level = this._parseDataRequestLevel(data?.level);

        return !!(
            from && typeof from === 'string'
            && level !== undefined  && typeof level === 'number'
        );

    }

    private static _getTargetByRandom (targets: number) : number {

        return Math.floor(Math.random() * Math.floor(targets));

    }

    private static _getNextTargetByRandom (targets: Array<string>) {

        // FIXME: Change to use crypto module

        return targets[ this._getTargetByRandom(targets.length) ];

    }

    private _getSlowestTarget (targets: Array<string>) {

        let sortedTargets = [].concat(targets);

        sortedTargets = sortedTargets.filter((item: string) : boolean => {

            let averageA = ObjectUtils.hasProperty(this._nodeAverageSpeed, item) ? this._nodeAverageSpeed[item] : 9999;

            return averageA >= DLDB_MINIMUM_NETWORK_DELAY;

        });

        if (!sortedTargets.length) {
            return DLDBServer._getNextTargetByRandom(targets);
        }

        sortedTargets.sort((aTarget : string, bTarget : string) : number => {

            let averageA = ObjectUtils.hasProperty(this._nodeAverageSpeed, aTarget) ? this._nodeAverageSpeed[aTarget] : 9999;
            let averageB = ObjectUtils.hasProperty(this._nodeAverageSpeed, bTarget) ? this._nodeAverageSpeed[bTarget] : 9999;

            if (averageA < DLDB_MINIMUM_NETWORK_DELAY) {
                averageA = DLDB_MINIMUM_NETWORK_DELAY;
            }

            if (averageB < DLDB_MINIMUM_NETWORK_DELAY) {
                averageB = DLDB_MINIMUM_NETWORK_DELAY;
            }

            if (averageA === averageB) {
                return 0;
            }

            return averageA < averageB ? 1 : -1;

        });

        // console.log( 'SORTED: ' + sortedTargets.map(item => {
        //     const speed = ObjectUtils.hasProperty(this._nodeAverageSpeed, item) ? this._nodeAverageSpeed[item] : 9999;
        //     return `${item} with ${speed} ms`;
        // }).join(', ') );

        const firstTarget = sortedTargets[ 0 ];
        const firstAverage = `${Math.round(ObjectUtils.hasProperty(this._nodeAverageSpeed, firstTarget) ? this._nodeAverageSpeed[firstTarget] : 9999)}`;

        const identicalTargets = sortedTargets.filter(item => {

            const itemAverage = `${Math.round(ObjectUtils.hasProperty(this._nodeAverageSpeed, item) ? this._nodeAverageSpeed[item] : 9999)}`;

            return firstAverage === itemAverage;

        });

        if (identicalTargets.length >= 2) {
            return DLDBServer._getNextTargetByRandom(identicalTargets);
        }

        return sortedTargets[ 0 ];

    }

    /**
     * Send processed data to node(s)
     *
     * @param data
     * @param targetUrl
     */
    private sendDataToSingleTarget (data: DLDBIncomingDataObject, targetUrl: string) : Promise<void> {

        const startTime = Date.now();

        const url = `${targetUrl}${RoutePath.INCOMING_DATA}`;

        return HttpUtils.request(HttpMethod.POST, url, data).then(
            (responseData : Record<string, any>) => {

                const endTime = Date.now();
                const duration = endTime - startTime;

                if (ObjectUtils.hasProperty(this._nodeDataRequestLevels, targetUrl)) {

                    if (data.level === DataRequestLevel.WRITE_ACCESS) {

                        delete this._nodeDataRequestLevels[targetUrl];

                        console.log( `[${duration} ms] Sent writable data to ${targetUrl}: It's no longer marked to wait for data`);

                    } else if (this._nodeDataRequestLevels[targetUrl] === DataRequestLevel.READ_ACCESS) {

                        delete this._nodeDataRequestLevels[targetUrl];

                        console.log( `[${duration} ms] Sent read-only data (${data.level}) to ${targetUrl}: It's no longer marked to wait for data`);

                    } else {

                        console.log( `[${duration} ms] Sent read-only data (${data.level}) to ${targetUrl}: It's still waiting writable data (${this._nodeDataRequestLevels[targetUrl]})`);

                    }

                // } else if (data.level === DataRequestLevel.READ_ACCESS) {
                //
                //     console.warn('We were not waiting for readonly data.');

                }

                if (!this._serverStateOk && responseData?.status === DLDBResponseStatus.OK) {

                    this._serverStateOk = true;

                    console.log(`[${duration} ms] ${url} [SUCCESS]: Node state OK`);

                } else {

                    if (responseData?.status !== DLDBResponseStatus.OK) {
                        console.log(`[${duration} ms] ${url} [SUCCESS]: `, responseData);
                    }

                }

                // Update time averages
                if (!ObjectUtils.hasProperty(this._nodeAverageSampleSize, targetUrl)) {

                    this._nodeAverageSampleSize[targetUrl] = 1;

                    this._nodeAverageSpeed[targetUrl] = duration;

                } else {

                    const prevSampleSize = this._nodeAverageSampleSize[targetUrl];

                    const prevAverageSpeed = this._nodeAverageSpeed[targetUrl];

                    const newAverageSpeed = this._nodeAverageSpeed[targetUrl] = prevAverageSpeed + ( duration - prevAverageSpeed ) / (prevSampleSize + 1);

                    if ( `${Math.round(newAverageSpeed / 100)}` !== `${Math.round(prevAverageSpeed / 100)}` ) {
                        console.log(`Node ${targetUrl} average speed updated as ${newAverageSpeed} ms (from ${prevAverageSpeed})`);
                    }

                }

            }
        ).catch( err => {

            console.error(`${url} [FAIL]: ` , err);

            this._serverStateOk = false;

            return Promise.reject(err);

        });

    }

    public _getTargetsRequestingWriteAccess () : Array<string> {

        return Object.keys(this._nodeDataRequestLevels).filter( (targetUrl : string) : boolean => {

            const targetLevel = this._nodeDataRequestLevels[targetUrl];

            return targetLevel === DataRequestLevel.WRITE_ACCESS;

        });

    }

    public _getTargetsRequestingReadAccess () : Array<string> {

        return Object.keys(this._nodeDataRequestLevels).filter( (targetUrl : string) : boolean => {

            const targetLevel = this._nodeDataRequestLevels[targetUrl];

            return targetLevel === DataRequestLevel.READ_ACCESS;

        });

    }

    public _getTargetsRequestingReadOrWriteAccess () : Array<string> {

        return Object.keys(this._nodeDataRequestLevels);

    }

    public _getNextTargetByRequest (level: DataRequestLevel, targets: Array<string>) : string {

        if (level === DataRequestLevel.WRITE_ACCESS) {

            const targetsWantingWriteAccess = this._getTargetsRequestingWriteAccess();

            if (targetsWantingWriteAccess.length) {

                const target = DLDBServer._getNextTargetByRandom(targetsWantingWriteAccess);

                console.log(`${targetsWantingWriteAccess.length} nodes requested write access, picked: ${target}${targetsWantingWriteAccess.length >= 2 ? ' by random' : '' }`);

                return target;

            }

        }

        const targetsWantingAnyAccess = this._getTargetsRequestingReadOrWriteAccess();

        if (targetsWantingAnyAccess.length) {

            const target = DLDBServer._getNextTargetByRandom(targetsWantingAnyAccess);

            console.log(`${targetsWantingAnyAccess.length} nodes requested read access, picked: ${target}${targetsWantingAnyAccess.length >= 2 ? ' by random' : '' }`);

            return target;

        }

        if (targets.length === 1) {
            return targets[0];
        }

        const target = this._getSlowestTarget(targets);
        //console.log(`Picked next target ${target} by random.`);
        return target;

    }

    /**
     * Send processed data to node(s)
     *
     * @param data
     * @param targets
     */
    public sendDataToOneOfTargets (data: DLDBIncomingDataObject, targets: Array<string>) : string {

        if (!DLDBServer._isIncomingDataObject(data)) {
            throw new TypeError('Cannot send invalid data object');
        }

        let targetUrl = this._getNextTargetByRequest(data.level, targets);

        this.sendDataToSingleTarget(data, targetUrl).catch( () => {

            if (data.level === DataRequestLevel.WRITE_ACCESS) {

                this.sendDataToOneOfTargets(data, targets);

            }

        });

        return targetUrl;

    }

    /**
     * Notify remote node about our need for data
     *
     * @param level
     * @param targets
     */
    public static sendDataRequest (level: DataRequestLevel, targets: Array<string>) {

        targets.forEach((targetUrl: string) => {

            const url = `${targetUrl}${RoutePath.INCOMING_DATA_REQUEST}`;

            HttpUtils.request(HttpMethod.POST, url, {from: DLDB_PUBLIC_URL, level: level}).then(
                (data : Record<string, any>) => {
                    console.log(`${url} [SUCCESS]: `, data.status);
                }
            ).catch( err => {
                console.error(`${url} [FAIL]: ` , err);
            });

        });

    }

    /**
     * Processes incoming data from another DLDB node.
     *
     * This node will execute queued operations on the received data.
     *
     * Returns the updated data.
     */
    public processIncomingDataPayload (level: DataRequestLevel, data: Record<string, any>) : Record<string, any> {

        let newData = data;

        if (level === DataRequestLevel.WRITE_ACCESS) {

            while (this._postQueue.length) {

                const item : PostQueueObject = this._postQueue.shift();

                const oldData = data;

                newData = {
                    ...data,
                    ...item.input
                };

                console.log('DLDB state changed from ', oldData, ' to ', newData, ' with ', item.input);

                this._getQueue.push(item);

            }

        }

        while (this._getQueue.length) {

            const item : GetQueueObject = this._getQueue.shift();

            HttpUtils.jsonResponse(item.res,200, {payload: newData});

        }

        return newData;

    }

    /**
     * Request to a data in the DLDB database.
     *
     * This action will add the request to a queue to be handler later, when the data is received.
     *
     * @param method
     * @param req
     * @param res
     */
    public delayedDataRequest (method : HttpMethod, req: IncomingMessage, res: ServerResponse) {

        // Append the request to queues
        switch (method) {

            case HttpMethod.GET:

                this._getQueue.push({res});

                DLDBServer.sendDataRequest(DataRequestLevel.READ_ACCESS, DLDB_NODES);

                break;

            case HttpMethod.POST:

                HttpUtils.parseResponseJson(req).then( (data : any) => {

                    this._postQueue.push({res, input: data});

                    DLDBServer.sendDataRequest(DataRequestLevel.WRITE_ACCESS, DLDB_NODES);

                }).catch( err => DLDBServer.processBadRequestParseErrorResponse(res, err) );

                break;

            default:
                HttpUtils.errorResponse(res,405, 'Method not supported');

        }


    }

    /**
     * Process incoming data
     */
    private processIncomingData (res : ServerResponse, data : DLDBIncomingDataObject) {

        const passphrase = data.secret;

        if ( !passphrase || (StringUtils.sha512(passphrase) !== DLDB_INCOMING_SECRET) ) {
            HttpUtils.errorResponse(res,403, 'Access Denied', {status: DLDBResponseStatus.ERROR});
            return;
        }

        // FIXME: Implement better a security check to validate where the request originated

        const from = data.from;

        if (!DLDB_NODES.some(item => item === from)) {
            return DLDBServer.processBadRequestInvalidObjectContentResponse(res);
        }

        // Clear the data request state since clearly the packet just came from there
        if ( ObjectUtils.hasProperty(this._nodeDataRequestLevels, from) ) {

            if (data.level === DataRequestLevel.WRITE_ACCESS) {
                delete this._nodeDataRequestLevels[from];
                console.log(`${from} no longer marked to want data, since we received writable data from there.`);
            }

            if (data.level === DataRequestLevel.READ_ACCESS && this._nodeDataRequestLevels[from] === DataRequestLevel.READ_ACCESS) {
                delete this._nodeDataRequestLevels[from];
                console.log(`${from} no longer marked to want data, since we received read only data from there.`);
            }

        }

        const payload = data.payload ?? {};

        const newData = this.processIncomingDataPayload(data.level, payload);

        HttpUtils.jsonResponse(res,200, {status: DLDBResponseStatus.OK });

        if (data.level === DataRequestLevel.WRITE_ACCESS) {

            if (this._getTargetsRequestingReadOrWriteAccess().length) {

                const writeTarget = this.sendDataToOneOfTargets({
                    from: DLDB_PUBLIC_URL,
                    secret: passphrase,
                    level: DataRequestLevel.WRITE_ACCESS,
                    payload: newData
                }, DLDB_NODES);

                const readOnlyTargets = this._getTargetsRequestingReadAccess().filter(item => item !== writeTarget);

                if (readOnlyTargets.length) {

                    readOnlyTargets.forEach(readTarget => {

                        this.sendDataToOneOfTargets({
                            from: DLDB_PUBLIC_URL,
                            secret: passphrase,
                            level: DataRequestLevel.READ_ACCESS,
                            payload: newData
                        }, [readTarget]);

                    });

                }

            } else {

                setTimeout(() => {

                    this.sendDataToOneOfTargets({
                        from: DLDB_PUBLIC_URL,
                        secret: passphrase,
                        level: DataRequestLevel.WRITE_ACCESS,
                        payload: newData
                    }, DLDB_NODES);

                }, DLDB_SEND_DELAY);

            }

        }

    }

    /**
     * Process request for incoming data
     */
    private processIncomingDataRequest (res : ServerResponse, data : DLDBIncomingDataRequestObject) {

        // FIXME: Implement a security check to validate where the request originated

        const from = data.from;

        if (!DLDB_NODES.some(item => item === from)) {
            return DLDBServer.processBadRequestInvalidObjectContentResponse(res);
        }

        const level = data.level;

        let changed = false;

        if (ObjectUtils.hasProperty(this._nodeDataRequestLevels, from)) {

            if (level > this._nodeDataRequestLevels[from]) {

                this._nodeDataRequestLevels[from] = level;

                changed = true;

                console.log(`${from} is waiting for writable data (${level}) now`);

            }

        } else {

            this._nodeDataRequestLevels[from] = level;

            changed = true;

            if (level === DataRequestLevel.WRITE_ACCESS) {
                console.log(`${from} is waiting for writable data (${level}) now`);
            } else {
                console.log(`${from} is waiting for read-only data (${level}) now`);
            }

        }

        if (!changed) {

            console.warn(`${from} notified us, but we knew it already.`);

        }

        HttpUtils.jsonResponse(res,200, {status: DLDBResponseStatus.OK, changed: changed });

    }

    /**
     * Process HTTP server request
     *
     * @param req
     * @param res
     */
    public preProcessRequest (req: IncomingMessage, res : ServerResponse) {

        try {

            const url    : string                 = req.url;

            const method : HttpMethod | undefined = HttpUtils.parseHttpMethod(req.method);

            switch (url) {

                case RoutePath.INCOMING_DATA:

                    HttpUtils.parseResponseJson(req).then( (data : Record<string, any>) => {

                        if (DLDBServer._isIncomingDataObject(data)) {
                            this.processIncomingData(res, data);
                        } else {

                            DLDBServer.processBadRequestInvalidObjectResponse(res);

                            console.log('Invalid Object: ', data);

                        }

                    }).catch( err => DLDBServer.processBadRequestParseErrorResponse(res, err) );

                    break;

                case RoutePath.INCOMING_DATA_REQUEST:
                    HttpUtils.parseResponseJson(req).then( (data : Record<string, any>) => {

                        if (DLDBServer._isIncomingDataRequestObject(data)) {

                            this.processIncomingDataRequest(res, data);

                        } else {

                            DLDBServer.processBadRequestInvalidObjectResponse(res);

                            console.log('Invalid Object: ', data);

                        }

                    }).catch( err => DLDBServer.processBadRequestParseErrorResponse(res, err) );
                    break;

                case RoutePath.DELAYED_DATA_REQUEST:
                    this.delayedDataRequest(method, req, res);
                    break;

                default:
                    DLDBServer.processNotFoundResponse(res);

            }

        } catch (err) {
            DLDBServer.processInternalErrorResponse(res, err);
        }

    }

    public static processInternalErrorResponse (res : ServerResponse, err: any) {

        console.error('ERROR: ', err);

        HttpUtils.errorResponse(res,500, 'Internal Error', {status: DLDBResponseStatus.ERROR});

    }

    public static processNotFoundResponse (res : ServerResponse) {

        HttpUtils.errorResponse(res,404, 'Not Found', {status: DLDBResponseStatus.ERROR});

    }

    public static processBadRequestParseErrorResponse (res : ServerResponse, err: any) {

        console.error('Error: ', err);

        HttpUtils.errorResponse(res,400, 'Bad Request: Parse Error', {status: DLDBResponseStatus.ERROR});

    }

    public static processBadRequestInvalidObjectResponse (res : ServerResponse) {

        HttpUtils.errorResponse(res,400, 'Bad Request: Invalid Object', {status: DLDBResponseStatus.ERROR});

    }

    public static processBadRequestInvalidObjectContentResponse (res : ServerResponse) {

        HttpUtils.errorResponse(res,400, 'Bad Request: Invalid Object Content', {status: DLDBResponseStatus.ERROR});

    }

}

export default DLDBServer;
