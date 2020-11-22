import DlObject from "./DlObject";
import DlObjectState from "./DlObjectState";
import AssertUtils from "./AssertUtils";
import Observer, {ObserverDestructor} from "./Observer";

export enum DlInstanceEvent {

    STATE_CHANGED = 'DlInstanceEvent:stateChanged'

}

export class DlInstance<T> {

    public static Event = DlInstanceEvent;

    private _obj      : DlObject<T> | undefined;
    private _state    : DlObjectState;
    private _observer : Observer<DlInstanceEvent>;

    public constructor (obj : DlObject<T> | undefined, state : DlObjectState) {
        this._obj = obj;
        this._state = state;
        this._observer = new Observer<DlInstanceEvent>('DlInstance');
    }

    public on (name : DlInstanceEvent, callback) : ObserverDestructor {
        return this._observer.listenEvent(name, callback);
    }

    public getState () : DlObjectState {
        return this._state;
    }

    public getObject () : DlObject<T> | undefined {
        return this._obj;
    }

    public isMounted () : boolean {
        return this._state >= DlObjectState.PRE_INITIALIZED_AND_MOUNTED;
    }

    /**
     * Returns `true` if `objectDidInitialize()` has been called.
     */
    public isPreInitialized () : boolean {
        return this._state >= DlObjectState.PRE_INITIALIZED;
    }

    public isInitialized () : boolean {
        return this._state >= DlObjectState.WILL_BE_DESTROYED || this._state === DlObjectState.UNMOUNTED;
    }

    public isDestroyed () : boolean {
        return this._state === DlObjectState.DESTROYED;
    }

    public willBeDestroyed () : boolean {
        return this._state <= DlObjectState.PRE_DESTROYED || this._state === DlObjectState.WILL_BE_DESTROYED;
    }

    public isConstructed () : boolean {
        return this._state !== DlObjectState.DESTROYED;
    }


    public mount () {

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

    }

    public unmount () {

        if (!this.isMounted()) {
            console.warn('Warning! The object was not mounted.');
            return;
        }

        this._objectWillUnmount();

    }

    public preInitialize () {

        if (this.isPreInitialized()) {
            console.warn('Warning! Object was already initialized.');
            return;
        }

        if (this.willBeDestroyed()) {
            console.warn('Warning! Cannot initialize object which will be destroyed.');
            return;
        }

        this._objectWillInitialize();

    }

    /**
     * Will call `objectDidInitialize()` on the object.
     *
     * If the object has not been pre-initialized, will call `objectWillInitialize()` on the object first.
     *
     * If the object has not been mounted, will mount the object by calling `objectDidMount()`.
     */
    public initialize () {

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

    }


    private _callMethod (name : string, args : Array<any> = []) {

        if (this._obj[name]) {
            try {
                 this._obj[name](...args);
            } catch (err) {
                console.error(`Exception in method "${name}": `, err);
            }
        }

    }

    private _setState (newState: DlObjectState) {

        const oldState = this._state;

        switch(newState) {

            case DlObjectState.DESTROYED:
                AssertUtils.notEqual(oldState, DlObjectState.DESTROYED);
                break;

            case DlObjectState.PRE_DESTROYED:
                AssertUtils.notEqual(oldState, DlObjectState.PRE_DESTROYED);
                break;

            case DlObjectState.CONSTRUCTED:
                AssertUtils.notEqual(oldState, DlObjectState.CONSTRUCTED);
                break;

            case DlObjectState.UNMOUNTED:
                AssertUtils.notEqual(oldState, DlObjectState.UNMOUNTED);
                break;

            case DlObjectState.PRE_INITIALIZED:
                AssertUtils.notEqual(oldState, DlObjectState.PRE_INITIALIZED);
                break;

            case DlObjectState.PRE_INITIALIZED_AND_MOUNTED:
                AssertUtils.notEqual(oldState, DlObjectState.PRE_INITIALIZED_AND_MOUNTED);
                break;

            case DlObjectState.WILL_BE_DESTROYED:
                AssertUtils.notEqual(oldState, DlObjectState.WILL_BE_DESTROYED);
                break;

            case DlObjectState.MOUNTED:
                AssertUtils.notEqual(oldState, DlObjectState.MOUNTED);
                break;

            default:
                throw new TypeError('Unsupported state: ' + newState);

        }

        this._state = newState;

        this._observer.triggerEvent(DlInstanceEvent.STATE_CHANGED, newState, oldState);

    }

    private _objectDidMount () {

        AssertUtils.isFalse( this.isMounted() );

        this._callMethod('objectDidMount');

        if (!this.isInitialized()) {

            AssertUtils.isTrue( this.isPreInitialized() );

            this._setState(DlObjectState.PRE_INITIALIZED_AND_MOUNTED);

        } else {
            this._setState(DlObjectState.MOUNTED);
        }

    }

    private _objectWillUnmount () {

        AssertUtils.isTrue( this.isMounted() );

        this._callMethod('objectWillUnmount');

        if (!this.isInitialized()) {

            if (this.isPreInitialized()) {
                this._setState(DlObjectState.PRE_INITIALIZED);
            } else {
                this._setState(DlObjectState.CONSTRUCTED);
            }

        } else {
            this._setState(DlObjectState.UNMOUNTED);
        }

    }

    private _objectWillInitialize () {

        AssertUtils.isFalse( this.isPreInitialized() );

        this._callMethod('objectWillInitialize');

        this._setState(DlObjectState.PRE_INITIALIZED);

    }

    private _objectDidInitialize () {

        AssertUtils.isFalse( this.isInitialized() );

        this._callMethod('objectDidInitialize');

        this._setState(DlObjectState.MOUNTED);

    }

}

export default DlInstance;
