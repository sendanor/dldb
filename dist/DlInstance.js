"use strict";
exports.__esModule = true;
exports.DlInstance = exports.DlInstanceEvent = void 0;
var DlObjectState_1 = require("./DlObjectState");
var AssertUtils_1 = require("./AssertUtils");
var Observer_1 = require("./Observer");
var DlInstanceEvent;
(function (DlInstanceEvent) {
    DlInstanceEvent["STATE_CHANGED"] = "DlInstanceEvent:stateChanged";
})(DlInstanceEvent = exports.DlInstanceEvent || (exports.DlInstanceEvent = {}));
var DlInstance = /** @class */ (function () {
    function DlInstance(obj, state) {
        this._obj = obj;
        this._state = state;
        this._observer = new Observer_1["default"]('DlInstance');
    }
    DlInstance.prototype.on = function (name, callback) {
        return this._observer.listenEvent(name, callback);
    };
    DlInstance.prototype.getState = function () {
        return this._state;
    };
    DlInstance.prototype.getObject = function () {
        return this._obj;
    };
    DlInstance.prototype.isMounted = function () {
        return this._state >= DlObjectState_1["default"].PRE_INITIALIZED_AND_MOUNTED;
    };
    /**
     * Returns `true` if `objectDidInitialize()` has been called.
     */
    DlInstance.prototype.isPreInitialized = function () {
        return this._state >= DlObjectState_1["default"].PRE_INITIALIZED;
    };
    DlInstance.prototype.isInitialized = function () {
        return this._state >= DlObjectState_1["default"].WILL_BE_DESTROYED || this._state === DlObjectState_1["default"].UNMOUNTED;
    };
    DlInstance.prototype.isDestroyed = function () {
        return this._state === DlObjectState_1["default"].DESTROYED;
    };
    DlInstance.prototype.willBeDestroyed = function () {
        return this._state <= DlObjectState_1["default"].PRE_DESTROYED || this._state === DlObjectState_1["default"].WILL_BE_DESTROYED;
    };
    DlInstance.prototype.isConstructed = function () {
        return this._state !== DlObjectState_1["default"].DESTROYED;
    };
    DlInstance.prototype.mount = function () {
        if (this.isMounted()) {
            console.warn('Warning! The object was already mounted.');
            return;
        }
        if (this.willBeDestroyed()) {
            console.warn('Warning! Cannot mount object which will be destroyed.');
            return;
        }
        if (!this.isPreInitialized()) {
            this._objectWillInitialize();
        }
        this._objectDidMount();
    };
    DlInstance.prototype.unmount = function () {
        if (!this.isMounted()) {
            console.warn('Warning! The object was not mounted.');
            return;
        }
        this._objectWillUnmount();
    };
    DlInstance.prototype.preInitialize = function () {
        if (this.isPreInitialized()) {
            console.warn('Warning! Object was already initialized.');
            return;
        }
        if (this.willBeDestroyed()) {
            console.warn('Warning! Cannot initialize object which will be destroyed.');
            return;
        }
        this._objectWillInitialize();
    };
    /**
     * Will call `objectDidInitialize()` on the object.
     *
     * If the object has not been pre-initialized, will call `objectWillInitialize()` on the object first.
     *
     * If the object has not been mounted, will mount the object by calling `objectDidMount()`.
     */
    DlInstance.prototype.initialize = function () {
        if (this.isInitialized()) {
            console.warn('Warning! Object was already initialized.');
            return;
        }
        if (this.willBeDestroyed()) {
            console.warn('Warning! Cannot initialize object which will be destroyed.');
            return;
        }
        if (!this.isPreInitialized()) {
            this._objectWillInitialize();
        }
        if (!this.isMounted()) {
            this._objectDidMount();
        }
        this._objectDidInitialize();
    };
    DlInstance.prototype._callMethod = function (name, args) {
        var _a;
        if (args === void 0) { args = []; }
        if (this._obj[name]) {
            try {
                (_a = this._obj)[name].apply(_a, args);
            }
            catch (err) {
                console.error("Exception in method \"" + name + "\": ", err);
            }
        }
    };
    DlInstance.prototype._setState = function (newState) {
        var oldState = this._state;
        switch (newState) {
            case DlObjectState_1["default"].DESTROYED:
                AssertUtils_1["default"].notEqual(oldState, DlObjectState_1["default"].DESTROYED);
                break;
            case DlObjectState_1["default"].PRE_DESTROYED:
                AssertUtils_1["default"].notEqual(oldState, DlObjectState_1["default"].PRE_DESTROYED);
                break;
            case DlObjectState_1["default"].CONSTRUCTED:
                AssertUtils_1["default"].notEqual(oldState, DlObjectState_1["default"].CONSTRUCTED);
                break;
            case DlObjectState_1["default"].UNMOUNTED:
                AssertUtils_1["default"].notEqual(oldState, DlObjectState_1["default"].UNMOUNTED);
                break;
            case DlObjectState_1["default"].PRE_INITIALIZED:
                AssertUtils_1["default"].notEqual(oldState, DlObjectState_1["default"].PRE_INITIALIZED);
                break;
            case DlObjectState_1["default"].PRE_INITIALIZED_AND_MOUNTED:
                AssertUtils_1["default"].notEqual(oldState, DlObjectState_1["default"].PRE_INITIALIZED_AND_MOUNTED);
                break;
            case DlObjectState_1["default"].WILL_BE_DESTROYED:
                AssertUtils_1["default"].notEqual(oldState, DlObjectState_1["default"].WILL_BE_DESTROYED);
                break;
            case DlObjectState_1["default"].MOUNTED:
                AssertUtils_1["default"].notEqual(oldState, DlObjectState_1["default"].MOUNTED);
                break;
            default:
                throw new TypeError('Unsupported state: ' + newState);
        }
        this._state = newState;
        this._observer.triggerEvent(DlInstanceEvent.STATE_CHANGED, newState, oldState);
    };
    DlInstance.prototype._objectDidMount = function () {
        AssertUtils_1["default"].isFalse(this.isMounted());
        this._callMethod('objectDidMount');
        if (!this.isInitialized()) {
            AssertUtils_1["default"].isTrue(this.isPreInitialized());
            this._setState(DlObjectState_1["default"].PRE_INITIALIZED_AND_MOUNTED);
        }
        else {
            this._setState(DlObjectState_1["default"].MOUNTED);
        }
    };
    DlInstance.prototype._objectWillUnmount = function () {
        AssertUtils_1["default"].isTrue(this.isMounted());
        this._callMethod('objectWillUnmount');
        if (!this.isInitialized()) {
            if (this.isPreInitialized()) {
                this._setState(DlObjectState_1["default"].PRE_INITIALIZED);
            }
            else {
                this._setState(DlObjectState_1["default"].CONSTRUCTED);
            }
        }
        else {
            this._setState(DlObjectState_1["default"].UNMOUNTED);
        }
    };
    DlInstance.prototype._objectWillInitialize = function () {
        AssertUtils_1["default"].isFalse(this.isPreInitialized());
        this._callMethod('objectWillInitialize');
        this._setState(DlObjectState_1["default"].PRE_INITIALIZED);
    };
    DlInstance.prototype._objectDidInitialize = function () {
        AssertUtils_1["default"].isFalse(this.isInitialized());
        this._callMethod('objectDidInitialize');
        this._setState(DlObjectState_1["default"].MOUNTED);
    };
    DlInstance.Event = DlInstanceEvent;
    return DlInstance;
}());
exports.DlInstance = DlInstance;
exports["default"] = DlInstance;
