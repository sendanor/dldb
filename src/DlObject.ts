/**
 * Interface for DLDB objects
 */
export interface DlObject<T> {

    /**
     * Called on the object any time the object is created to the Node’s memory.
     *
     * You shouldn’t interact with anything outside of the Object here.
     *
     * It’s just intended to construct the object’s memory inside the Node.
     *
     * You should not expect any other methods to be called unless objectDidCreate() or objectDidMount() has been called.
     */
    new? (state?: T) : DlObject<T>;

    /**
     * This method should return the state of the object in the same type as it was when supplied to the constructor, or
     * otherwise in a format which another constructor will recognize.
     *
     * If the object has not been created or mounted yet, this method should always return the same state as passed to
     * the constructor (but not necessarily the same reference and may include default values).
     */
    getObjectState?() : T;

    /**
     * This method is called when a new object is created in the DLDB cloud for the first time and only once in its
     * lifetime.
     *
     * This method will be called before the objectDidMount() will be called for the first time.
     */
    objectWillInitialize?();

    /**
     * Called just after the object has been mounted to the node.
     *
     * You may start to listen to events, setup timers, or interact with services on the Node.
     */
    objectDidMount?();

    /**
     * This method is called when a new object is created in the DLDB cloud for the first time and only once in its
     * lifetime.
     *
     * It will be called just after componentDidMount() has been called for the first time.
     */
    objectDidInitialize?();

    /**
     * Called on the object any time the object is going to be destroyed.
     *
     * This will be called before objectWillUnmount() to give the object a change to interact with the outside world.
     */
    objectWillDestroy?();

    /**
     * Called just before the object will be unmounted from the node.
     *
     * You must do everything necessary in your program before a sleep period.
     *
     * You should cancel any asynchronous operations, stop listening events, unset timers, and possibly interact with
     * any local services on the Node before the object goes to sleep.
     */
    objectWillUnmount?();

    /**
     * Called on the object as the last action before the object’s reference and state is going to be forgotten from the
     * Node.
     *
     * This will be called after objectWillDestroy() and objectWillUnmount() has been called, in that order.
     */
    objectDidDestroy?();

}

export default DlObject;
