// Copyright 2020 Jaakko Heusala <jheusala@iki.fi>
// Licence: MIT

import AssertUtils from "./AssertUtils";

const ENABLE_EMPTY_LISTENER_WARNING : boolean = !!process.env?.WARN_UNUSED_LISTENERS;

export interface ObserverCallback<EventName extends keyof any> {
    (event: EventName, ...args : Array<any>) : void;
}

export interface ObserverDestructor {
    () : void;
}

export type ObserverCallbackArray<EventName extends keyof any> = Array<ObserverCallback<EventName>>;

export type ObserverRecord<EventName extends keyof any> = Record<EventName, ObserverCallbackArray<EventName> >;

/**
 * This is a simple observer implementation for implementing synchronous in-process events for a local service.
 *
 * You'll use it like:
 *
 * ```
 * enum FooEvent {
 *     CHANGED = "FooService:changed"
 * }
 *
 * class FooService {
 *
 *     private static _data : any;
 *     private static _observer : Observer<FooEvent> = {};
 *
 *     public static getData () : any {
 *         return this._data;
 *     }
 *
 *     public static on (name : FooEvent, callback) : ObserverDestructor {
 *         return this._observer.listenEvent(name, callback);
 *     }
 *
 *     public static refreshData () {
 *
 *         HttpService.doSomething().then((response) => {
 *
 *             this._data = response.data;
 *
 *             this._observer.triggerEvent(FooEvent.CHANGED);
 *
 *         }).catch(err => {
 *             console.error('Error: ', err);
 *         });
 *
 *     }
 *
 * }
 *
 * FooService.on(FooEvent.CHANGED, () => {
 *
 *     const currentData = FooService.getData();
 *     // ...
 *
 * });
 *
 * FooService.refreshData();
 *
 * ```
 *
 */
export class Observer<EventName extends keyof any> {

    private _name      : string;
    private _callbacks : ObserverRecord<EventName>;

    getName () : string {
        return this._name;
    }

    /**
     *
     * @param name You can name this observer, so that you know where it is used.
     */
    constructor(name: string) {

        this._name = name;
        this._callbacks = {} as ObserverRecord<EventName>;

    }

    /**
     * Destroy the observer data. Stop using this object after you use destroy.
     */
    public destroy () {

        // @ts-ignore
        this._name = undefined;

        // @ts-ignore
        this._callbacks = undefined;

    }

    /**
     * Check if eventName has listeners.
     *
     * @param eventName
     */
    public hasCallbacks (eventName : EventName) : boolean {
        return !!this._callbacks && Object.prototype.hasOwnProperty.call(this._callbacks, eventName);
    }

    /**
     * Trigger an event
     *
     * @param eventName
     * @param args
     */
    public triggerEvent (eventName : EventName, ...args : Array<any>) {

        if (!this.hasCallbacks(eventName)) {
            if (ENABLE_EMPTY_LISTENER_WARNING) {
                console.warn(`Warning! The observer for "${this._name}" did not have anything listening "${eventName}"`);
            }
            return;
        }

        const callbacks = this._callbacks[eventName];

        AssertUtils.isArray(callbacks);

        callbacks.forEach(callback => {
            try {
                callback(eventName, ...args);
            } catch( e ) {
                console.error(`Observer "${this._name}" and the event handler for "${eventName}" returned an exception: `, e);
            }
        });

    }

    /**
     * Start listening events.
     *
     * Returns destructor function.
     *
     * @param eventName
     * @param callback
     */
    public listenEvent (eventName : EventName, callback : ObserverCallback<EventName> ) : ObserverDestructor {

        if (!this.hasCallbacks(eventName)) {
            this._callbacks[eventName] = [ callback ];
        } else {
            this._callbacks[eventName].push( callback );
        }

        return () => this.removeListener(eventName, callback);

    }

    /**
     * Removes the first found listener callback for eventName
     *
     * @param eventName
     * @param callback
     */
    public removeListener (eventName : EventName, callback: ObserverCallback<EventName>) : void {

        if (!this.hasCallbacks(eventName)) {
            console.warn(`Warning! Could not remove callback since the observer for "${this._name}" did not have anything listening "${eventName}"`);
            return;
        }

        let removedOnce = false;

        AssertUtils.isArray(this._callbacks[eventName]);

        this._callbacks[eventName] = this._callbacks[eventName].filter(item => {

            if ( !removedOnce && item === callback ) {
                removedOnce = true;
                return false;
            }

            return true;

        });

        if (this._callbacks[eventName].length === 0) {
            delete this._callbacks[eventName];
        }

        if (!removedOnce) {
            console.warn(`Warning! Could not remove the callback since the observer for "${this._name}" did not have that callback`);
            return;
        }

    }

}

export default Observer;
