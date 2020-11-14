
const CRYPTO = require('crypto');

export class StringUtils {

    static isEmpty (value : string) : boolean {
        return value === '';
    }

    static notEmpty (value : string) : boolean {
        return value !== '';
    }

    static toLowerCase (value: string) : string {

        return value.toLowerCase();

    }

    static trim (value: string) : string {

        return value.replace(/^ /g, "").replace(/ $/g, "");

    }

    static sha512 (value: string) : string {

        const hash = CRYPTO.createHash('sha512');

        const data = hash.update(value, 'utf8');

        return data.digest('hex');

    }

}

export default StringUtils;
