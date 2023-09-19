import { useState, useEffect, useRef } from 'react';
import { LibhackCustomError } from './libhack_custom_error';

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


export function rollingZscore2(arr: Array<number>, lookback: number | undefined): Array<number> {
    if (lookback == null || lookback > arr.length) {
        lookback = arr.length;
    }
    const rollingMean_ = rollingMean(arr, lookback);
    const rollingStd_ = rollingStd(arr, lookback);
    return arr.map((n: number, idx: number, thisArr: number[]): number => {
        const a = n - rollingMean_[idx];
        const b = rollingStd_[idx];
        return b > 0 ? a / b : 0.;
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
    dst.setTime(dst.getTime() + nDays * dayMillis);
    return dst;
}

export function sameDay(d1: Date, d2: Date): boolean {
    // return asDay(d1).getTime() === asDay(d2).getTime();
    // return d1.toLocaleDateString() == d2.toLocaleDateString();
    return d1.getUTCFullYear() === d2.getUTCFullYear() && d1.getUTCMonth() === d2.getUTCMonth() && d1.getUTCDate() === d2.getUTCDate();
}

export function asDay(d: Date): Date {
    d.setUTCHours(0);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    return d;
}

export function formatDateYYYYMMDD(d: Date): string {
    return d.getUTCFullYear() + '-' + (d.getUTCMonth()+1).toString().padStart(2, '0') + '-' + d.getUTCDate().toString().padStart(2, '0');
}

interface ViewportDimensions {
    width: number,
    height: number,
}

function getViewportDimensions(): ViewportDimensions {
    const { innerWidth: width, innerHeight: height } = window;
    return { width, height };
}

export function useViewportDimensions() {
    const [viewportDimensions, setViewportDimensions] = useState(getViewportDimensions());
    useEffect(() => {
        function handleResize() {
            setViewportDimensions(getViewportDimensions());
        }
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    return viewportDimensions;
}

// common device resolutions (px)
export const SCREEN_SMALL = 640;
export const SCREEN_MEDIUM = 768;
export const SCREEN_LARGE = 1024;
export const SCREEN_XLARGE = 1280;
export const SCREEN_2XLARGE = 1536;

export class LibhackAssertionError extends LibhackCustomError {
    constructor(message?: string) {
        super(message);
    }
}

export function LHAssert(pred: boolean, message?: string): void {
    if (process.env.NODE_ENV !== 'production') {
        // TODO(zds): ensure this code doesn't show up in production build

        if (pred === false) {
            throw new LibhackAssertionError(message);
        }
    }
}

export const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
