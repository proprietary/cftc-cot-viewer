export interface ArrSlice<T> {
    arr: Array<T>
    startIndex: number
    endIndex: number
}

export function newArrSlice<T>(
    arr: Array<T>,
    startIndex?: number | undefined,
    endIndex?: number | undefined
): ArrSlice<T> {
    if (startIndex == null) {
        startIndex = 0
    }
    if (endIndex == null) {
        endIndex = arr.length
    }
    if (
        startIndex < 0 ||
        startIndex > arr.length ||
        endIndex < 0 ||
        endIndex > arr.length ||
        endIndex < startIndex
    ) {
        throw new ArrSliceBoundsError()
    }
    return { arr, startIndex, endIndex }
}

export function testArrSliceBounds<T>(arrSlice: ArrSlice<T>): boolean {
    return (
        arrSlice.startIndex >= 0 &&
        arrSlice.endIndex >= 0 &&
        arrSlice.endIndex >= arrSlice.startIndex &&
        arrSlice.startIndex <= arrSlice.arr.length &&
        arrSlice.endIndex <= arrSlice.arr.length
    )
}

export function checkArrSliceBounds<T>(arrSlice: ArrSlice<T>) {
    if (arrSlice == null) {
        throw new Error('undefined ArrSlice')
    }
    if (!testArrSliceBounds(arrSlice)) {
        throw new ArrSliceBoundsError()
    }
}

export class ArrSliceBoundsError extends Error {
    constructor(message?: string) {
        super(
            '`startIndex` or `endIndex` out of bounds of array given in this `ArrSlice`' +
                message !=
                null
                ? ': ' + message
                : ''
        )
        Object.setPrototypeOf(this, ArrSliceBoundsError.prototype)
        Error.captureStackTrace(this, ArrSliceBoundsError)
    }
}
