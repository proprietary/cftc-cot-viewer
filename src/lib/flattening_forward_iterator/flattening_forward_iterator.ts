export default class FlatteningForwardIterator<T> implements Iterable<T> {
    private aggregated: Array<readonly T[]>
    private outerIdx = 0
    private innerIdx = 0

    constructor(...arrays: Array<readonly T[]>) {
        this.aggregated = arrays
    }

    [Symbol.iterator](): Iterator<T> {
        return this
    }

    public next(): IteratorResult<T> {
        if (this.outerIdx >= this.aggregated.length) {
            return {
                done: true,
                value: undefined as any,
            }
        }
        if (this.innerIdx >= this.aggregated[this.outerIdx].length) {
            this.outerIdx += 1
            this.innerIdx = 0
        }
        if (this.outerIdx >= this.aggregated.length) {
            return {
                done: true,
                value: undefined as any,
            }
        }
        return {
            done: false,
            value: this.aggregated[this.outerIdx][this.innerIdx++],
        }
    }
}
