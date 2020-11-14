import HttpUtils, {HttpMethod} from "./HttpUtils";
import {IncomingMessage, ServerResponse} from "http";
import RoutePath from "./RoutePath";

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

export class DLDBServer {

    private _getQueue  : Array<GetQueueObject>;

    private _postQueue : Array<PostQueueObject>;

    constructor () {

        this._getQueue  = [];

        this._postQueue = [];

    }

    private static _getTargetByRandom (targets: number) : number {
        return Math.floor(Math.random() * Math.floor(targets));
    }

    public static sendData (data: Record<string, any>, targets: Array<string>) {

        if (targets.length <= 0) {
            console.error('ERROR: We do not have configured nodes to send data. Data cannot persist.\n\nPlease configure using DLDB_NODES environment variable.');
            return;
        }

        const targetUrl = targets[ this._getTargetByRandom(targets.length) ];

        HttpUtils.request(HttpMethod.POST, `${targetUrl}${RoutePath.INCOMING_DATA}`, data).then(
            (data : Record<string, any>) => {
                console.log(`${targetUrl} [SUCCESS]: `, data.status);
            }
        ).catch( err => {
            console.error(`${targetUrl} [FAIL]: ` , err);
        });

    }

    /**
     * Processes incoming data from another DLDB node.
     *
     * This node will execute queued operations on the received data.
     *
     * Returns the updated data.
     */
    public processIncomingData (data: Record<string, any>) : Record<string, any> {

        let newData = data;

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

        switch (method) {

            case HttpMethod.GET:
                this._getQueue.push({res});
                break;

            case HttpMethod.POST:
                HttpUtils.parseResponseJson(req).then( (data : any) => {
                    this._postQueue.push({res, input: data});
                });
                break;

            default:
                HttpUtils.errorResponse(res,405, 'Method not supported');

        }

    }

}

export default DLDBServer;
