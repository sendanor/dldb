import HttpUtils, {HttpMethod} from "./HttpUtils";
import {DLDB_HOSTNAME, DLDB_INCOMING_SECRET, DLDB_NODES, DLDB_PORT, DLDB_SEND_DELAY} from "./Environment";
import {IncomingMessage, ServerResponse} from "http";
import DLDBServer, {DLDBResponseStatus} from "./DLDBServer";
import RoutePath from "./RoutePath";
import StringUtils from "./StringUtils";

const HTTP = require('http');

const DLDB = new DLDBServer();

const SERVER = HTTP.createServer((req: IncomingMessage, res : ServerResponse) => {

    try {

        const url    : string                 = req.url;

        const method : HttpMethod | undefined = HttpUtils.parseHttpMethod(req.method);

        switch (url) {

            case RoutePath.INCOMING_DATA:

                HttpUtils.parseResponseJson(req).then( (data : Record<string, any>) => {

                    const passphrase = data?.secret ?? '';

                    if ( !passphrase || (StringUtils.sha512(passphrase) !== DLDB_INCOMING_SECRET) ) {
                        HttpUtils.errorResponse(res,403, 'Access Denied', {status: DLDBResponseStatus.ERROR});
                        return;
                    }

                    const payload = data?.payload ?? {};

                    const newData = DLDB.processIncomingData(payload);

                    HttpUtils.jsonResponse(res,200, {status: DLDBResponseStatus.OK });

                    setTimeout(() => {

                        DLDBServer.sendData({
                            secret: passphrase,
                            payload: newData
                        }, DLDB_NODES);

                    }, DLDB_SEND_DELAY);

                });

                break;

            case RoutePath.DELAYED_DATA_REQUEST:
                DLDB.delayedDataRequest(method, req, res);
                break;

            default:
                HttpUtils.errorResponse(res,400, 'Not Found', {status: DLDBResponseStatus.ERROR});

        }

    } catch (err) {

        console.error('ERROR: ', err);

        HttpUtils.errorResponse(res,500, 'Internal Error', {status: DLDBResponseStatus.ERROR});

    }

});

SERVER.listen(DLDB_PORT, DLDB_HOSTNAME, () => {

    console.log(`DLDB node running at http://${DLDB_HOSTNAME}:${DLDB_PORT}/ using nodes: ${ DLDB_NODES.join(' ') }`);

});
