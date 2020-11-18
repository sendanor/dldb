import {IncomingMessage, ServerResponse} from "http";
import StringUtils from "./StringUtils";
const HTTP = require('http');

export enum HttpMethod {

    GET = 'get',
    POST = 'post',
    DELETE = 'delete'

}

export class HttpUtils {

    static parseHttpMethod (value : string) : HttpMethod | undefined {

        value = StringUtils.toLowerCase(value);

        switch (value) {
            case 'get'    : return HttpMethod.GET;
            case 'post'   : return HttpMethod.POST;
            case 'delete' : return HttpMethod.DELETE;
        }

        return undefined;

    }

    static stringResponse (res : ServerResponse, contentType: string, code: number, data : string) {

        res.statusCode = code;
        res.setHeader('Content-Type', contentType);
        res.end(data);

    }

    static jsonResponse (res : ServerResponse, code: number, data : any) {

        let responseData;
        try {
            responseData = JSON.stringify(data, null, 2);
        } catch (err) {
            throw new TypeError('HttpUtils.jsonResponse: Could not stringify data');
        }

        HttpUtils.stringResponse(res, 'application/json', code, responseData);

    }

    static errorResponse (res : ServerResponse, code: number, error: string, data: Record<string, any> = {}) {

        HttpUtils.jsonResponse(res, code, {...data, code, error});

    }

    static parseResponseJson (req : IncomingMessage) : Promise<any> {

        return new Promise( (resolve, reject) => {

            try {

                const data : Array<Buffer> = [];

                req.on('data', (chunk : Buffer) => {
                    data.push(chunk);
                });

                req.on('end', () => {
                    try {

                        resolve( JSON.parse( Buffer.concat(data).toString('utf8') ) );

                    } catch (err) {
                        reject(err);
                    }
                });

            } catch (err) {
                reject(err);
            }

        });

    }

    public static request (method: HttpMethod, url: string, data: Record<string, any>) : Promise<Record<string, any>> {

        return new Promise( (resolve, reject) => {

            try {

                const u = new URL(url);

                const postData = JSON.stringify(data);

                const options = {
                    hostname: u.hostname,
                    port: u?.port ?? 80,
                    path: u?.pathname ?? '/',
                    method: method ?? 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = HTTP.request(options, (res) => {

                    try {

                        const statusCode : number = res?.statusCode ?? 0;

                        if (statusCode >= 200 && statusCode < 300) {
                            HttpUtils.parseResponseJson(res).then(resolve).catch(reject);
                        } else {
                            HttpUtils.parseResponseJson(res).then(reject).catch(reject);
                        }

                    } catch (err) {
                        reject(err);
                    }

                });

                req.on('error', (e) => {
                    reject(e);
                });

                // Write data to request body
                req.write(postData);
                req.end();

            } catch( err ) {
                reject(err);
            }

        });

    }

}

export default HttpUtils;
