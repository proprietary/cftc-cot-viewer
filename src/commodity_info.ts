import next from 'next/types';
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
    items: T[],
    // getDate is how you retrieve the 'Date' contained in `data`
    getDate: (item: T) => Date,
    // return a new T that sets the contained date to `newDate`
    setDate: (item: T, newDate: Date) => T,
};

export function alignDatetimes<T, Q>(src: DatetimeAlignmentContainer<T>, fitToTarget: DatetimeAlignmentContainer<Q>): T[] {
    if (src.items.length === 0 || fitToTarget.items.length === 0) {
        return [];
    }

    let dst: T[] = [];
    // prepare the input series data
    // sort in descending order
    const targetData = [...fitToTarget.items].sort((a: Q, b: Q) => fitToTarget.getDate(b).getTime() - fitToTarget.getDate(a).getTime());
    let srcData = [...src.items].sort((a: T, b: T) => src.getDate(b).getTime() - src.getDate(a).getTime());

    // using the `fitToTarget` dates, look for the entries in `src` with nearest dates
    for (let targetIdx = 0, srcIdx = 0; srcIdx < srcData.length && targetIdx < targetData.length; ++targetIdx) {
        // advance to the next item in `src` that is closest in time to this `targetTime`
        let minimalTimeDiff = Infinity; // Math.abs(src.getDate(srcData[srcIdx]).getTime() - fitToTarget.getDate(targetData[targetIdx]).getTime());
        for (let srcIdx2 = srcIdx; srcIdx2 < srcData.length; ++srcIdx2) {
            let maybeMinimalTimeDiff = Math.abs(src.getDate(srcData[srcIdx2]).getTime() - fitToTarget.getDate(targetData[targetIdx]).getTime());
            if (maybeMinimalTimeDiff > minimalTimeDiff) {
                // because the series are sorted by time, assume the time differences will keep getting smaller on each iteration
                // so the encounter with a larger time difference indicates the rest of the series will be even larger
                // there's no need to check the rest of the series after this one
                break;
            }
            if (maybeMinimalTimeDiff <= minimalTimeDiff) {
                minimalTimeDiff = maybeMinimalTimeDiff;
                srcIdx = srcIdx2;
            }
        }
        const result = src.setDate(srcData[srcIdx], fitToTarget.getDate(targetData[targetIdx]));
        dst.push(result);
    }

    return dst.reverse();
}