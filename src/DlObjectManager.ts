import {DlObject} from "./DlObject";
import DlObjectState from "./DlObjectState";

export interface DlObjectManagerItem {

    state: DlObjectState,

    object: DlObject<any>;

}

export class DlObjectManager {

    private readonly _objects : Array<DlObjectManagerItem>;

    constructor () {
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
    registerObject (item: DlObjectManagerItem) {
        this._objects.push({...item});
    }

    /**
     * Loop through the objects and initialize any constructed objects
     */
    initializeObjects () {

    }

}

export default DlObjectManager;
