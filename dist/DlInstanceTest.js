"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.DlInstanceTest = exports.MyLifeCycleObject = void 0;
var AssertUtils_1 = require("./AssertUtils");
var DlInstance_1 = require("./DlInstance");
var DlObjectState_1 = require("./DlObjectState");
var DlObjectTest_1 = require("./DlObjectTest");
var MyLifeCycleObject = /** @class */ (function (_super) {
    __extends(MyLifeCycleObject, _super);
    function MyLifeCycleObject() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return MyLifeCycleObject;
}(DlObjectTest_1.MyObject));
exports.MyLifeCycleObject = MyLifeCycleObject;
var DlInstanceTest = /** @class */ (function () {
    function DlInstanceTest() {
    }
    DlInstanceTest.canCreateInstance = function () {
        var obj = new DlInstance_1["default"](new DlObjectTest_1.MyObject(), DlObjectState_1["default"].CONSTRUCTED);
        AssertUtils_1["default"].isObject(obj);
    };
    DlInstanceTest.canPreInitializeInstanceWithoutMethod = function () {
        var obj = new DlInstance_1["default"](new DlObjectTest_1.MyObject(), DlObjectState_1["default"].CONSTRUCTED);
        AssertUtils_1["default"].isObject(obj);
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].CONSTRUCTED);
        obj.preInitialize();
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].PRE_INITIALIZED);
    };
    DlInstanceTest.canMountInstanceWithoutMethod = function () {
        var obj = new DlInstance_1["default"](new DlObjectTest_1.MyObject(), DlObjectState_1["default"].CONSTRUCTED);
        AssertUtils_1["default"].isObject(obj);
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].CONSTRUCTED);
        obj.mount();
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].PRE_INITIALIZED_AND_MOUNTED);
    };
    DlInstanceTest.canUnmountUninitializedInstanceWithoutMethod = function () {
        var obj = new DlInstance_1["default"](new DlObjectTest_1.MyObject(), DlObjectState_1["default"].CONSTRUCTED);
        AssertUtils_1["default"].isObject(obj);
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].CONSTRUCTED);
        obj.mount();
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].PRE_INITIALIZED_AND_MOUNTED);
        obj.unmount();
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].PRE_INITIALIZED);
    };
    DlInstanceTest.canUnmountInitializedInstanceWithoutMethod = function () {
        var obj = new DlInstance_1["default"](new DlObjectTest_1.MyObject(), DlObjectState_1["default"].CONSTRUCTED);
        AssertUtils_1["default"].isObject(obj);
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].CONSTRUCTED);
        obj.initialize();
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].MOUNTED);
        obj.unmount();
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].UNMOUNTED);
    };
    DlInstanceTest.canInitializeInstanceWithoutMethod = function () {
        var obj = new DlInstance_1["default"](new DlObjectTest_1.MyObject(), DlObjectState_1["default"].CONSTRUCTED);
        AssertUtils_1["default"].isObject(obj);
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].CONSTRUCTED);
        obj.initialize();
        AssertUtils_1["default"].isEqual(obj.getState(), DlObjectState_1["default"].MOUNTED);
    };
    return DlInstanceTest;
}());
exports.DlInstanceTest = DlInstanceTest;
