import HttpUtils, {HttpMethod} from "./HttpUtils";
import {IncomingMessage, ServerResponse} from "http";
import RoutePath from "./RoutePath";
import StringUtils from "./StringUtils";
import {
    DLDB_INCOMING_SECRET,
    DLDB_MINIMUM_NETWORK_DELAY,
    DLDB_NODES,
    DLDB_PUBLIC_URL, DLDB_REQUEST_SECRET,
    DLDB_SEND_DELAY
} from "./Environment";
import {ObjectUtils} from "./ObjectUtils";

export enum DataRequestLevel {

    READ_ACCESS,

    WRITE_ACCESS

}

export interface GetQueueObject {

    id: string;

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

    readonly secret  : string;

    readonly from    : string;

    readonly level   : DataRequestLevel;

}

export class DLDBServer {

    private _serverStateOk : boolean;

    private _timeoutCallback : Record<string, any>;
    private _timeout         : Record<string, any>;

    private _getQueue  : Array<GetQueueObject>;

    private _postQueue : Array<PostQueueObject>;

    private readonly _nodeDataRequestLevels : Record<string, Record<string, DataRequestLevel>>;
    private readonly _nodeAverageSpeed      : Record<string, number>;
    private readonly _nodeAverageSampleSize : Record<string, number>;

    constructor () {

        this._serverStateOk = true;

        this._getQueue  = [];

        this._postQueue = [];

        this._nodeDataRequestLevels = {};

        this._nodeAverageSpeed = {};
        this._nodeAverageSampleSize = {};
        this._timeoutCallback = {};
        this._timeout = {};

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
            payload
            && secret && typeof secret === 'string'
            && from && typeof from === 'string'
            && typeof payload === 'object' && !(payload instanceof Array)
            && level !== undefined && typeof level === 'number'
        );

    }

    private static _isIncomingDataRequestObject (data: Record<string, any>) : data is DLDBIncomingDataRequestObject {

        const secret = data?.secret;

        const from = data?.from;

        const level = this._parseDataRequestLevel(data?.level);

        return !!(
            from && typeof from === 'string'
            && secret && typeof secret === 'string'
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
     * @param resourceId
     */
    private sendDataToSingleTarget (data: DLDBIncomingDataObject, targetUrl: string, resourceId: string) : Promise<void> {

        const startTime = Date.now();

        const url = `${targetUrl}${RoutePath.INCOMING_DATA}/${resourceId}`;

        return HttpUtils.request(HttpMethod.POST, url, data).then(
            (responseData : Record<string, any>) => {

                const endTime = Date.now();
                const duration = endTime - startTime;

                if ( ObjectUtils.hasProperty(this._nodeDataRequestLevels, targetUrl)
                    && ObjectUtils.hasProperty(this._nodeDataRequestLevels[targetUrl], resourceId) ) {

                    const levels = this._nodeDataRequestLevels[targetUrl];

                    if (data.level === DataRequestLevel.WRITE_ACCESS) {

                        delete levels[resourceId];

                        console.log( `[${resourceId}] [${duration} ms] [${resourceId}] Sent writable data to ${targetUrl}: It's no longer marked to wait for data`);

                    } else if (levels[resourceId] === DataRequestLevel.READ_ACCESS) {

                        delete levels[resourceId];

                        console.log( `[${resourceId}] [${duration} ms] [${resourceId}] Sent read-only data (${data.level}) to ${targetUrl}: It's no longer marked to wait for data`);

                    } else {

                        console.log( `[${resourceId}] [${duration} ms] [${resourceId}] Sent read-only data (${data.level}) to ${targetUrl}: It's still waiting writable data (${levels[resourceId]})`);

                    }

                    if (Object.keys(levels).length <= 0) {
                        delete this._nodeDataRequestLevels[targetUrl];
                    }

                // } else if (data.level === DataRequestLevel.READ_ACCESS) {
                //
                //     console.warn('We were not waiting for readonly data.');

                }

                if (!this._serverStateOk && responseData?.status === DLDBResponseStatus.OK) {

                    this._serverStateOk = true;

                    console.log(`[${resourceId}] [${duration} ms] ${url} [SUCCESS]: Node state OK`);

                } else {

                    if (responseData?.status !== DLDBResponseStatus.OK) {
                        console.log(`[${resourceId}] [${duration} ms] ${url} [SUCCESS]: `, responseData);
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
                        console.log(`[${resourceId}] Node ${targetUrl} average speed updated as ${newAverageSpeed} ms (from ${prevAverageSpeed})`);
                    }

                }

            }
        ).catch( err => {

            console.error(`[${resourceId}] ${url} [FAIL]: ` , err);

            this._serverStateOk = false;

            return Promise.reject(err);

        });

    }

    public _getTargetsRequestingWriteAccess (resourceId : string) : Array<string> {

        return Object.keys(this._nodeDataRequestLevels).filter( (targetUrl : string) : boolean => {

            if (!ObjectUtils.hasProperty(this._nodeDataRequestLevels[targetUrl], resourceId)) {
                return false;
            }

            const targetLevel = this._nodeDataRequestLevels[targetUrl][resourceId];

            return targetLevel === DataRequestLevel.WRITE_ACCESS;

        });

    }

    public _getTargetsRequestingReadAccess (resourceId : string) : Array<string> {

        return Object.keys(this._nodeDataRequestLevels).filter( (targetUrl : string) : boolean => {

            if (!ObjectUtils.hasProperty(this._nodeDataRequestLevels[targetUrl], resourceId)) {
                return false;
            }

            const targetLevel = this._nodeDataRequestLevels[targetUrl][resourceId];

            return targetLevel === DataRequestLevel.READ_ACCESS;

        });

    }

    public _getTargetsRequestingReadOrWriteAccess (resourceId : string) : Array<string> {

        return Object.keys(this._nodeDataRequestLevels).filter( (targetUrl : string) : boolean => {

            return ObjectUtils.hasProperty(this._nodeDataRequestLevels[targetUrl], resourceId);

        });

    }

    public _getNextTargetByRequest (level: DataRequestLevel, targets: Array<string>, resourceId : string) : string {

        if (level === DataRequestLevel.WRITE_ACCESS) {

            const targetsWantingWriteAccess = this._getTargetsRequestingWriteAccess(resourceId);

            if (targetsWantingWriteAccess.length) {

                const target = DLDBServer._getNextTargetByRandom(targetsWantingWriteAccess);

                console.log(`[${resourceId}] ${targetsWantingWriteAccess.length} nodes requested write access, picked: ${target}${targetsWantingWriteAccess.length >= 2 ? ' by random' : '' }`);

                return target;

            }

        }

        const targetsWantingAnyAccess = this._getTargetsRequestingReadOrWriteAccess(resourceId);

        if (targetsWantingAnyAccess.length) {

            const target = DLDBServer._getNextTargetByRandom(targetsWantingAnyAccess);

            console.log(`[${resourceId}] ${targetsWantingAnyAccess.length} nodes requested read access, picked: ${target}${targetsWantingAnyAccess.length >= 2 ? ' by random' : '' }`);

            return target;

        }

        if (targets.length === 1) {
            return targets[0];
        }

        return this._getSlowestTarget(targets);

    }

    /**
     * Send processed data to node(s)
     *
     * @param data
     * @param targets
     * @param resourceId
     */
    public sendDataToOneOfTargets (data: DLDBIncomingDataObject, targets: Array<string>, resourceId: string) : string {

        if (!DLDBServer._isIncomingDataObject(data)) {
            throw new TypeError('[' + resourceId + '] Cannot send invalid data object');
        }

        let targetUrl = this._getNextTargetByRequest(data.level, targets, resourceId);

        this.sendDataToSingleTarget(data, targetUrl, resourceId).catch( () => {

            if (data.level === DataRequestLevel.WRITE_ACCESS) {

                this.sendDataToOneOfTargets(data, targets, resourceId);

            }

        });

        return targetUrl;

    }

    /**
     * Notify remote node about our need for data
     *
     * @param level
     * @param targets
     * @param resourceId
     * @param secret
     */
    public static sendDataRequest (level: DataRequestLevel, targets: Array<string>, resourceId: string, secret: string) {

        targets.forEach((targetUrl: string) => {

            const url = `${targetUrl}${RoutePath.INCOMING_DATA_REQUEST}/${resourceId}`;

            HttpUtils.request(HttpMethod.POST, url, {secret: secret, from: DLDB_PUBLIC_URL, level: level}).then(
                (data : Record<string, any>) => {
                    console.log(`[${resourceId}] ${url} [SUCCESS]: `, data.status);
                }
            ).catch( err => {
                console.error(`[${resourceId}] ${url} [FAIL]: ` , err);
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
    public processIncomingDataPayload (level: DataRequestLevel, data: Record<string, any>, resourceId: string) : Record<string, any> {

        let newData = data;

        let postQueue = this._postQueue.filter(item => item.id === resourceId);
        let getQueue  =  this._getQueue.filter(item => item.id === resourceId);

        this._postQueue = this._postQueue.filter(item => item.id !== resourceId);
        this._getQueue  =  this._getQueue.filter(item => item.id !== resourceId);

        if (level === DataRequestLevel.WRITE_ACCESS) {

            while (postQueue.length) {

                const item : PostQueueObject = postQueue.shift();

                const oldData = data;

                newData = {
                    ...data,
                    ...item.input
                };

                console.log(`[${resourceId}] DLDB state changed from `, oldData, ' to ', newData, ' with ', item.input);

                getQueue.push(item);

            }

        }

        while (getQueue.length) {

            const item : GetQueueObject = getQueue.shift();

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
     * @param resourceId
     */
    public delayedDataRequest (method : HttpMethod, req: IncomingMessage, res: ServerResponse, resourceId: string) {

        // Append the request to queues
        switch (method) {

            case HttpMethod.GET:

                this._getQueue.push({res, id: resourceId});

                DLDBServer.sendDataRequest(DataRequestLevel.READ_ACCESS, DLDB_NODES, resourceId, DLDB_REQUEST_SECRET);

                this._clearTimeout(resourceId);

                break;

            case HttpMethod.POST:

                HttpUtils.parseResponseJson(req).then( (data : any) => {

                    this._postQueue.push({res, input: data, id: resourceId});

                    DLDBServer.sendDataRequest(DataRequestLevel.WRITE_ACCESS, DLDB_NODES, resourceId, DLDB_REQUEST_SECRET);

                    this._clearTimeout(resourceId);

                }).catch( err => DLDBServer.processBadRequestParseErrorResponse(res, err) );

                break;

            default:
                HttpUtils.errorResponse(res,405, 'Method not supported');

        }

    }

    /**
     * Process incoming data
     */
    private processIncomingData (res : ServerResponse, data : DLDBIncomingDataObject, resourceId: string) {

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

            if (ObjectUtils.hasProperty(this._nodeDataRequestLevels[from], resourceId)) {

                if (data.level === DataRequestLevel.WRITE_ACCESS) {
                    delete this._nodeDataRequestLevels[from][resourceId];
                    console.log(`${from} no longer marked to want data, since we received writable data from there.`);
                }

                if (data.level === DataRequestLevel.READ_ACCESS && this._nodeDataRequestLevels[from][resourceId] === DataRequestLevel.READ_ACCESS) {
                    delete this._nodeDataRequestLevels[from][resourceId];
                    console.log(`${from} no longer marked to want data, since we received read only data from there.`);
                }

                if (Object.keys(this._nodeDataRequestLevels[from]).length <= 0) {
                    delete this._nodeDataRequestLevels[from];
                }

            }

        }

        const payload = data.payload ?? {};

        const newData = this.processIncomingDataPayload(data.level, payload, resourceId);

        HttpUtils.jsonResponse(res,200, {status: DLDBResponseStatus.OK });

        if (data.level === DataRequestLevel.WRITE_ACCESS) {

            if (this._getTargetsRequestingReadOrWriteAccess(resourceId).length) {

                const writeTarget = this.sendDataToOneOfTargets({
                    from: DLDB_PUBLIC_URL,
                    secret: passphrase,
                    level: DataRequestLevel.WRITE_ACCESS,
                    payload: newData
                }, DLDB_NODES, resourceId);

                const readOnlyTargets = this._getTargetsRequestingReadAccess(resourceId).filter(item => item !== writeTarget);

                if (readOnlyTargets.length) {

                    readOnlyTargets.forEach(readTarget => {

                        this.sendDataToOneOfTargets({
                            from: DLDB_PUBLIC_URL,
                            secret: passphrase,
                            level: DataRequestLevel.READ_ACCESS,
                            payload: newData
                        }, [readTarget], resourceId);

                    });

                }

            } else {

                this._clearTimeout(resourceId);

                this._timeoutCallback[resourceId] = () => {

                    delete this._timeout[resourceId];
                    delete this._timeoutCallback[resourceId];

                    this.sendDataToOneOfTargets({
                        from: DLDB_PUBLIC_URL,
                        secret: passphrase,
                        level: DataRequestLevel.WRITE_ACCESS,
                        payload: newData
                    }, DLDB_NODES, resourceId);

                };

                this._timeout[resourceId] = setTimeout(this._timeoutCallback[resourceId], DLDB_SEND_DELAY);

            }

        }

    }

    private _clearTimeout (resourceId : string) {

        if (ObjectUtils.hasProperty(this._timeout, resourceId)) {

            clearTimeout(this._timeout[resourceId]);

            delete this._timeout[resourceId];

        }

        if ( ObjectUtils.hasProperty(this._timeoutCallback, resourceId) ) {

            this._timeoutCallback[resourceId]();

            delete this._timeoutCallback[resourceId];

        }

    }

    /**
     * Process request for incoming data
     */
    private processIncomingDataRequest (res : ServerResponse, data : DLDBIncomingDataRequestObject, resourceId : string) {

        const passphrase = data?.secret;

        if ( !passphrase || (passphrase !== DLDB_REQUEST_SECRET) ) {
            HttpUtils.errorResponse(res,403, 'Access Denied', {status: DLDBResponseStatus.ERROR});
            return;
        }

        const from = data.from;

        if (!DLDB_NODES.some(item => item === from)) {
            return DLDBServer.processBadRequestInvalidObjectContentResponse(res);
        }

        const level = data.level;

        let changed = false;

        if (ObjectUtils.hasProperty(this._nodeDataRequestLevels, from)) {

            if (ObjectUtils.hasProperty(this._nodeDataRequestLevels[from], resourceId)) {

                if (level > this._nodeDataRequestLevels[from][resourceId]) {

                    this._nodeDataRequestLevels[from][resourceId] = level;

                    changed = true;

                    console.log(`[${resourceId}] ${from} is waiting for writable data (${level}) now`);

                }

            }

        } else {

            this._nodeDataRequestLevels[from] = {[resourceId]: level};

            changed = true;

            if (level === DataRequestLevel.WRITE_ACCESS) {
                console.log(`[${resourceId}] ${from} is waiting for writable data (${level}) now`);
            } else {
                console.log(`[${resourceId}] ${from} is waiting for read-only data (${level}) now`);
            }

        }

        if (!changed) {

            console.warn(`[${resourceId}] ${from} notified us, but we knew it already.`);

        } else {

            this._clearTimeout(resourceId);

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

            // Handles incoming data
            if (url.startsWith(RoutePath.INCOMING_DATA + '/')) {

                const resourceId = DLDBServer.parseResourceId(url, RoutePath.INCOMING_DATA + '/');

                if (resourceId) {

                    HttpUtils.parseResponseJson(req).then((data: Record<string, any>) => {

                        if (DLDBServer._isIncomingDataObject(data)) {
                            this.processIncomingData(res, data, resourceId);
                        } else {

                            DLDBServer.processBadRequestInvalidObjectResponse(res);

                            console.log(`[${resourceId}] Invalid Object: `, data);

                        }

                    }).catch(err => DLDBServer.processBadRequestParseErrorResponse(res, err));

                } else {
                    DLDBServer.processNotFoundResponse(res);
                }

                return;

            }

            // Handles requests for data to other nodes
            if (url.startsWith(RoutePath.INCOMING_DATA_REQUEST + '/')) {

                const resourceId = DLDBServer.parseResourceId(url, RoutePath.INCOMING_DATA_REQUEST + '/');

                if (resourceId) {

                    HttpUtils.parseResponseJson(req).then((data: Record<string, any>) => {

                        if (DLDBServer._isIncomingDataRequestObject(data)) {

                            this.processIncomingDataRequest(res, data, resourceId);

                        } else {

                            DLDBServer.processBadRequestInvalidObjectResponse(res);

                            console.log(`[${resourceId}] Invalid Object: `, data);

                        }

                    }).catch(err => DLDBServer.processBadRequestParseErrorResponse(res, err));

                } else {

                    DLDBServer.processNotFoundResponse(res);

                }

                return;

            }

            // Handles data requests from users
            if (url.startsWith(RoutePath.DELAYED_DATA_REQUEST)) {

                const resourceId = DLDBServer.parseResourceId(url, RoutePath.DELAYED_DATA_REQUEST);

                if (resourceId) {

                    this.delayedDataRequest(method, req, res, resourceId);

                } else {
                    DLDBServer.processNotFoundResponse(res);
                }

                return;

            }

            DLDBServer.processNotFoundResponse(res);

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

    public static parseResourceId (url : string, prefix: string) : string | undefined {

        if (!url) {
            return undefined;
        }

        if (typeof url !== 'string') {
            return undefined;
        }

        url = url.substr(prefix.length);

        if (!url) {
            return undefined;
        }

        const parts = url.split('/');

        if (parts.length <= 0) {
            return undefined;
        }

        const id = parts.shift();

        if (!this.checkUuid(id)) {
            return undefined;
        }

        return id.toLowerCase();

    }

    public static checkUuid (value : string) : boolean {
        return /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(value);
    }

}

export default DLDBServer;
