"use strict";
exports.__esModule = true;
exports.DlObjectTest = exports.MyObject = void 0;
var AssertUtils_1 = require("./AssertUtils");
/**
 * This is a simple object for tests which has no life cycle functions
 */
var MyObject = /** @class */ (function () {
    function MyObject(state) {
        this.state = state;
    }
    MyObject.prototype.getObjectState = function () {
        return this.state;
    };
    return MyObject;
}());
exports.MyObject = MyObject;
var DlObjectTest = /** @class */ (function () {
    function DlObjectTest() {
    }
    DlObjectTest.canCreate = function () {
        var obj = new MyObject();
        AssertUtils_1["default"].isObject(obj);
    };
    DlObjectTest.canCreateWithState = function () {
        var objState = {
            value: 'hello'
        };
        var obj = new MyObject(objState);
        AssertUtils_1["default"].isObject(obj);
    };
    DlObjectTest.canAccessState = function () {
        var objState = {
            value: 'hello'
        };
        var obj = new MyObject(objState);
        AssertUtils_1["default"].isObject(obj);
        var returnedState = obj.getObjectState();
        AssertUtils_1["default"].isObject(returnedState);
        AssertUtils_1["default"].equals(returnedState.value, 'hello');
    };
    return DlObjectTest;
}());
exports.DlObjectTest = DlObjectTest;
