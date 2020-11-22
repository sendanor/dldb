"use strict";
// Copyright 2020 Jaakko Heusala <jheusala@iki.fi>
// Licence: MIT
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var _a;
exports.__esModule = true;
exports.Observer = void 0;
var AssertUtils_1 = require("./AssertUtils");
var ENABLE_EMPTY_LISTENER_WARNING = !!((_a = process.env) === null || _a === void 0 ? void 0 : _a.WARN_UNUSED_LISTENERS);
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
var Observer = /** @class */ (function () {
    /**
     *
     * @param name You can name this observer, so that you know where it is used.
     */
    function Observer(name) {
        this._name = name;
        this._callbacks = {};
    }
    Observer.prototype.getName = function () {
        return this._name;
    };
    /**
     * Destroy the observer data. Stop using this object after you use destroy.
     */
    Observer.prototype.destroy = function () {
        // @ts-ignore
        this._name = undefined;
        // @ts-ignore
        this._callbacks = undefined;
    };
    /**
     * Check if eventName has listeners.
     *
     * @param eventName
     */
    Observer.prototype.hasCallbacks = function (eventName) {
        return !!this._callbacks && Object.prototype.hasOwnProperty.call(this._callbacks, eventName);
    };
    /**
     * Trigger an event
     *
     * @param eventName
     * @param args
     */
    Observer.prototype.triggerEvent = function (eventName) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.hasCallbacks(eventName)) {
            if (ENABLE_EMPTY_LISTENER_WARNING) {
                console.warn("Warning! The observer for \"" + this._name + "\" did not have anything listening \"" + eventName + "\"");
            }
            return;
        }
        var callbacks = this._callbacks[eventName];
        AssertUtils_1["default"].isArray(callbacks);
        callbacks.forEach(function (callback) {
            try {
                callback.apply(void 0, __spreadArrays([eventName], args));
            }
            catch (e) {
                console.error("Observer \"" + _this._name + "\" and the event handler for \"" + eventName + "\" returned an exception: ", e);
            }
        });
    };
    /**
     * Start listening events.
     *
     * Returns destructor function.
     *
     * @param eventName
     * @param callback
     */
    Observer.prototype.listenEvent = function (eventName, callback) {
        var _this = this;
        if (!this.hasCallbacks(eventName)) {
            this._callbacks[eventName] = [callback];
        }
        else {
            this._callbacks[eventName].push(callback);
        }
        return function () { return _this.removeListener(eventName, callback); };
    };
    /**
     * Removes the first found listener callback for eventName
     *
     * @param eventName
     * @param callback
     */
    Observer.prototype.removeListener = function (eventName, callback) {
        if (!this.hasCallbacks(eventName)) {
            console.warn("Warning! Could not remove callback since the observer for \"" + this._name + "\" did not have anything listening \"" + eventName + "\"");
            return;
        }
        var removedOnce = false;
        AssertUtils_1["default"].isArray(this._callbacks[eventName]);
        this._callbacks[eventName] = this._callbacks[eventName].filter(function (item) {
            if (!removedOnce && item === callback) {
                removedOnce = true;
                return false;
            }
            return true;
        });
        if (this._callbacks[eventName].length === 0) {
            delete this._callbacks[eventName];
        }
        if (!removedOnce) {
            console.warn("Warning! Could not remove the callback since the observer for \"" + this._name + "\" did not have that callback");
            return;
        }
    };
    return Observer;
}());
exports.Observer = Observer;
exports["default"] = Observer;
