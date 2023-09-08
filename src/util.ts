import { AssertionError } from "assert";

export function std(arr: Array<number>, fromIdx: number | undefined, lookback: number | undefined): number {
    if (fromIdx == null || fromIdx > arr.length || fromIdx < 0) {
        fromIdx = arr.length - 1;
    }
    if (lookback == null || lookback > arr.length) {
        lookback = arr.length;
    }
    const mean_ = mean(arr, fromIdx, lookback);
    let variance = 0;
    for (let idx = fromIdx; idx > 0 && idx > fromIdx - lookback; --idx) {
        variance += Math.pow(arr[idx] - mean_, 2);
    }
    if (lookback > 0) {
        variance /= lookback;
    } else {
        return 0.;
    }
    return Math.sqrt(variance);
}

function mean(arr: Array<number>, fromIdx: number | undefined, lookback: number | undefined): number {
    if (fromIdx == null || fromIdx > arr.length || fromIdx < 0) {
        fromIdx = arr.length - 1;
    }
    if (lookback == null || lookback > arr.length) {
        lookback = arr.length;
    } else if (lookback === 0) {
        return 0.;
    } else if (lookback === 1) {
        return arr[0];
    }
    let sum = 0;
    let count = 0;
    for (let idx = fromIdx; idx > 0 && idx > fromIdx - lookback; --idx) {
        sum += arr[idx];
        count += 1;
    }
    if (count === 0) {
        return 0.;
    }
    return sum / count;
}

export function rollingMean(arr: number[], lookback: number): number[] {
    if (lookback < 0 || lookback > arr.length) {
        lookback = arr.length;
    }
    return arr.map((n: number, idx: number, thisArr: number[]): number => {
        return mean(thisArr, idx, lookback);
    });
}

export function rollingStd(arr: number[], lookback: number): number[] {
    if (lookback < 0 || lookback > arr.length) {
        lookback = arr.length;
    }
    const rollingMean_ = rollingMean(arr, lookback);
    return arr.map((n: number, idx: number, thisArr: number[]): number => {
        let variance = 0;
        let count = 0;
        for (let jdx = idx; jdx > 0 && jdx > idx - lookback; --jdx) {
            variance += Math.pow(n - rollingMean_[jdx], 2);
            count += 1;
        }
        if (count === 0) {
            return 0.;
        }
        return Math.sqrt(variance / count);
    });
}


export function rollingZscore(arr: Array<number>, lookback: number | undefined): Array<number> {
    if (lookback == null || lookback > arr.length) {
        lookback = arr.length;
    }
    const rollingMean_ = rollingMean(arr, lookback);
    const rollingStd_ = rollingStd(arr, lookback);
    return arr.map((n: number, idx: number, thisArr: number[]): number => {
        const a = n - rollingMean_[idx];
        const b = rollingStd_[idx];
        return b > 0 ? a/b : 0.;
    });
}

export function iso8601StringWithNoTimezoneOffset(d: Date): string {
    let s = d.toISOString();
    let i = s.length - 1;
    for (; i > 0; --i) {
        if (s[i] === '.') {
            break;
        }
    }
    return s.substring(0, i + 4);
}

// Calculates the number of days between two dates: a - b
export function daysDiff(a: Date, b: Date): number {
    const dayMillis = 1000 * 60 * 60 * 24;
    return (a.getTime() - b.getTime()) / dayMillis;
}

export function plusDays(d: Date, nDays: number): Date {
    let dst = new Date(d.getTime());
    const dayMillis = 1000 * 60 * 60 * 24;
    dst.setTime(dst.getTime() + nDays*dayMillis);
    return dst;
}