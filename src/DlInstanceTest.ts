import AssertUtils from "./AssertUtils";
import DlInstance from "./DlInstance";
import DlObjectState from "./DlObjectState";
import {MyObject} from "./DlObjectTest";

export class MyLifeCycleObject extends MyObject {



}

export class DlInstanceTest {

    public static canCreateInstance () {

        const obj = new DlInstance(new MyObject(), DlObjectState.CONSTRUCTED);

        AssertUtils.isObject(obj);

    }

    public static canPreInitializeInstanceWithoutMethod () {

        const obj = new DlInstance(new MyObject(), DlObjectState.CONSTRUCTED);

        AssertUtils.isObject(obj);
        AssertUtils.isEqual(obj.getState(), DlObjectState.CONSTRUCTED);

        obj.preInitialize();

        AssertUtils.isEqual(obj.getState(), DlObjectState.PRE_INITIALIZED);

    }

    public static canMountInstanceWithoutMethod () {

        const obj = new DlInstance(new MyObject(), DlObjectState.CONSTRUCTED);

        AssertUtils.isObject(obj);
        AssertUtils.isEqual(obj.getState(), DlObjectState.CONSTRUCTED);

        obj.mount();

        AssertUtils.isEqual(obj.getState(), DlObjectState.PRE_INITIALIZED_AND_MOUNTED);

    }

    public static canUnmountUninitializedInstanceWithoutMethod () {

        const obj = new DlInstance(new MyObject(), DlObjectState.CONSTRUCTED);

        AssertUtils.isObject(obj);
        AssertUtils.isEqual(obj.getState(), DlObjectState.CONSTRUCTED);

        obj.mount();

        AssertUtils.isEqual(obj.getState(), DlObjectState.PRE_INITIALIZED_AND_MOUNTED);

        obj.unmount();

        AssertUtils.isEqual(obj.getState(), DlObjectState.PRE_INITIALIZED);

    }

    public static canUnmountInitializedInstanceWithoutMethod () {

        const obj = new DlInstance(new MyObject(), DlObjectState.CONSTRUCTED);

        AssertUtils.isObject(obj);
        AssertUtils.isEqual(obj.getState(), DlObjectState.CONSTRUCTED);

        obj.initialize();

        AssertUtils.isEqual(obj.getState(), DlObjectState.MOUNTED);

        obj.unmount();

        AssertUtils.isEqual(obj.getState(), DlObjectState.UNMOUNTED);

    }

    public static canInitializeInstanceWithoutMethod () {

        const obj = new DlInstance(new MyObject(), DlObjectState.CONSTRUCTED);

        AssertUtils.isObject(obj);
        AssertUtils.isEqual(obj.getState(), DlObjectState.CONSTRUCTED);

        obj.initialize();

        AssertUtils.isEqual(obj.getState(), DlObjectState.MOUNTED);

    }

}
