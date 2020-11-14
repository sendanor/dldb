import StringUtils from "./StringUtils";

/**
 * Local DLDB node hostname where to listen connections
 */
export const DLDB_HOSTNAME : string                    = process?.env?.DLDB_HOSTNAME ?? '0.0.0.0';

/**
 * Local DLDB node port where to listen connections
 */
export const DLDB_PORT     : number                    = parseInt(process?.env?.DLDB_PORT ?? '3000', 10);

/**
 * Other remote nodes.
 */
export const DLDB_NODES    : Array<string> | undefined = (process?.env?.DLDB_NODES ?? '').split(' ').map(StringUtils.trim).filter(StringUtils.notEmpty);

/**
 * Secret which you must know to send the first incoming data packet.
 *
 * This must be a SHA512 hash of the passhprase.
 */
export const DLDB_INCOMING_SECRET : string = process?.env?.DLDB_INCOMING_SECRET ?? '';

/**
 * Delay to wait until sending the data to remote node(s) in milliseconds.
 */
export const DLDB_SEND_DELAY : number = parseInt(process?.env?.DLDB_SEND_DELAY ?? '300', 10);
