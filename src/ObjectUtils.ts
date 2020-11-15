
const hasOwnProperty = Object.prototype.hasOwnProperty;

export class ObjectUtils {

    public static hasProperty (obj: Record<string, any>, key: string) : boolean {

        return !!obj && hasOwnProperty.call(obj, key);

    }

}