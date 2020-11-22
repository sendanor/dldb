"use strict";
exports.__esModule = true;
exports.DlObjectState = void 0;
var DlObjectState;
(function (DlObjectState) {
    /**
     * The objectDidDestroy() has been called and the object has been destroyed.
     *
     * If you still have an access to this object, it's probably a memory leak.
     *
     *  - Mounted: No
     *  - Initialized: No
     *  - Pre Initialized: No
     *  - Destroyed: Yes
     *  - Constructed: No (or it's a leak)
     */
    DlObjectState[DlObjectState["DESTROYED"] = 0] = "DESTROYED";
    /**
     * The objectWillDestroy() and objectWillUnmount() has been called.
     *
     *  - Mounted: No
     *  - Initialized: No
     *  - Pre Initialized: No
     *  - Destroyed: No
     *  - Constructed: Yes
     *
     * The object will be destroyed and the state cannot be recovered back from this state.
     */
    DlObjectState[DlObjectState["PRE_DESTROYED"] = 1] = "PRE_DESTROYED";
    /**
     * The object has not been mounted nor initialized yet
     *
     *  - Mounted: No
     *  - Initialized: No
     *  - Pre Initialized: No
     *  - Destroyed: No
     *  - Constructed: Yes
     *
     *  If the object is going to be destroyed from this state, it can be deleted directly without calling any other object.
     */
    DlObjectState[DlObjectState["CONSTRUCTED"] = 2] = "CONSTRUCTED";
    /**
     * The objectWillInitialize() has been called, but the object has not been mounted yet for the first time
     *
     *  - Mounted: No
     *  - Initialized: No
     *  - Pre Initialized: Yes
     *  - Destroyed: No
     *  - Constructed: Yes
     *
     *  If the object is going to be destroyed from this state, only objectDidDestroy() must be called and state changed
     *  directly to DESTROYED.
     */
    DlObjectState[DlObjectState["PRE_INITIALIZED"] = 3] = "PRE_INITIALIZED";
    /**
     * The objectWillUnmount() has been called, but the object is still initialized.
     *
     *  - Mounted: No
     *  - Initialized: Yes
     *  - Pre Initialized: Yes
     *  - Destroyed: No
     *  - Constructed: Yes
     */
    DlObjectState[DlObjectState["UNMOUNTED"] = 4] = "UNMOUNTED";
    /**
     * The objectWillInitialize() and objectDidMount() has been called but objectDidInitialize() has not yet been called
     *
     *  - Mounted: Yes
     *  - Initialized: No
     *  - Pre Initialized: Yes
     *  - Destroyed: No
     *  - Constructed: Yes
     */
    DlObjectState[DlObjectState["PRE_INITIALIZED_AND_MOUNTED"] = 5] = "PRE_INITIALIZED_AND_MOUNTED";
    /**
     * The objectWillDestroy() has been called, but the object is still mounted.
     *
     * After this state, the object can only go down in states, next state PRE_DESTROYED.
     *
     *  - Mounted: Yes
     *  - Initialized: Yes
     *  - Pre Initialized: Yes
     *  - Destroyed: No
     *  - Constructed: Yes
     */
    DlObjectState[DlObjectState["WILL_BE_DESTROYED"] = 6] = "WILL_BE_DESTROYED";
    /**
     * Both objectDidInitialize() and objectDidMount() has been called and the object is in a fully functional state.
     *
     *  - Mounted: Yes
     *  - Initialized: Yes
     *  - Pre Initialized: Yes
     *  - Destroyed: No
     *  - Constructed: Yes
     */
    DlObjectState[DlObjectState["MOUNTED"] = 7] = "MOUNTED";
})(DlObjectState = exports.DlObjectState || (exports.DlObjectState = {}));
exports["default"] = DlObjectState;
