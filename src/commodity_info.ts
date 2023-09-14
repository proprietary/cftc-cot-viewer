import {CommodityCodes, IPriceFeed} from './cftc_codes_mapping';
import { requestFredSeries } from './fred_api';
import { LHAssert } from './util';

export async function getPriceFeed(priceFeed: IPriceFeed) {
    switch (priceFeed.source) {
        case 'FRED': {
            const series = requestFredSeries(priceFeed.symbol, process.env.FRED_API_KEY!);
            break;
        }
        default:
            throw new Error();
    }
}

export interface DatetimeAlignmentContainer<T> {
    // `T` is a data type that has a Date or Datetime type in it somewhere
    data: T[],
    // getDate is how you retrieve the 'Date' contained in `data`
    getDate: (x: T) => Date,
    // return a new T that sets the contained date to `newDate`
    setDate: (x: T, newDate: Date) => T,
};

export function alignDatetimes<T, Q>(src: DatetimeAlignmentContainer<T>, fitToTarget: DatetimeAlignmentContainer<Q>, toleranceMillis: number): T[] {
    if (src.data.length === 0 || fitToTarget.data.length === 0) {
        return [];
    }
    let output: T[] = [];
    const targetDatetimes = fitToTarget.data.map((x: Q) => fitToTarget.getDate(x)).sort((a, b) => b.getTime() - a.getTime());
    let srcData = [...src.data].sort((a: T, b: T) => src.getDate(b).getTime() - src.getDate(a).getTime());
    let srcIdx = 0;
    let targetIdx = 0;
    while (srcIdx < srcData.length && targetIdx < targetDatetimes.length) {
        const srcTime = src.getDate(srcData[srcIdx]).getTime();
        const refDtsTime = targetDatetimes[targetIdx].getTime();
        const timeDiffMillis = Math.abs(srcTime - refDtsTime);
        if (timeDiffMillis <= toleranceMillis) {
            const res = src.setDate(srcData[srcIdx], targetDatetimes[targetIdx]);
            output.push(res);
            targetIdx++;
            srcIdx++;
            continue;
        }
        if (srcTime > refDtsTime) {
            srcIdx++;
        } else if (refDtsTime > srcTime) {
            targetIdx++;
        } else {
            throw new Error('should be unreachable');
        }
    }
    return output.reverse();
}