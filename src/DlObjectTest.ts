import AssertUtils from "./AssertUtils";
import DlInstance from "./DlInstance";
import DlObjectState from "./DlObjectState";
import DlObject from "./DlObject";

export interface MyObjectState {
    value?: string;
}

/**
 * This is a simple object for tests which has no life cycle functions
 */
export class MyObject implements DlObject<MyObjectState> {

    private readonly state : MyObjectState;

    constructor (state?: MyObjectState) {
        this.state = state;
    }

    getObjectState (): MyObjectState {
        return this.state;
    }

}

export class DlObjectTest {

    public static canCreate () {

        const obj = new MyObject();

        AssertUtils.isObject(obj);

    }

    public static canCreateWithState () {

        const objState = {
            value: 'hello'
        };

        const obj = new MyObject(objState);

        AssertUtils.isObject(obj);

    }

    public static canAccessState () {

        const objState = {
            value: 'hello'
        };

        const obj = new MyObject(objState);

        AssertUtils.isObject(obj);

        const returnedState = obj.getObjectState();

        AssertUtils.isObject(returnedState);
        AssertUtils.equals(returnedState.value, 'hello');

    }

}
