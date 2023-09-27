export abstract class LibhackCustomError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options)

        // set error name as constructor name
        Object.defineProperty(this, 'name', {
            // See for `new.target`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new.target#new.target_in_constructors
            value: new.target.name,
            // native Error tpye is not enumerable either
            enumerable: false,
            configurable: true,
        })

        // Restore prototype chain:
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        if (typeof Object.setPrototypeOf === 'function') {
            Object.setPrototypeOf(this, new.target.prototype)
        } else {
            // IE11
            ;(this as any).__proto__ = new.target.prototype
        }

        // make stack traces work
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}
