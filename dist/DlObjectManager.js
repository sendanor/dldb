"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.DlObjectManager = void 0;
var DlObjectManager = /** @class */ (function () {
    function DlObjectManager() {
        this._objects = [];
    }
    /**
     * Register a new object in the manager.
     *
     * This manager does not clone the object itself, but it will take control of the life cycle of the object, so
     * you should not call any life cycle methods for it before you unload it from the manager.
     *
     * @param item
     */
    DlObjectManager.prototype.registerObject = function (item) {
        this._objects.push(__assign({}, item));
    };
    /**
     * Loop through the objects and initialize any constructed objects
     */
    DlObjectManager.prototype.initializeObjects = function () {
    };
    return DlObjectManager;
}());
exports.DlObjectManager = DlObjectManager;
exports["default"] = DlObjectManager;
