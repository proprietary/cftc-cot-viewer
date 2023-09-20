import { CommodityCodes } from './cftc_codes_mapping';
import { requestFredObservations } from './fred_api';
import { PriceBar, IPriceFeed, PriceFeedSource, CFTCCommodityCode } from './common_types';
import { sameDay, asDay } from './util';

export class CommodityInfoService {
    private cache: CommodityInfoDatabase = new CommodityInfoDatabase();

    public async requestPriceFeed(cftcCommodityCode: CFTCCommodityCode, priceFeed: IPriceFeed, onDates: Date[]): Promise<PriceBar[]> {
        if (onDates.length === 0) {
            throw new Error();
        }
        const lookUpToThisDate = onDates[onDates.length - 1];
        let priceBars = await this.cache.getPriceBars(priceFeed.source, cftcCommodityCode);
        if (priceBars.length === 0 || priceBars.at(-1)!.timestamp.getTime() < lookUpToThisDate.getTime()) {
            const newPriceBars = await this.requestExternalPriceFeed(priceFeed, lookUpToThisDate);
            if (newPriceBars.length > 0) {
                priceBars = priceBars.concat(newPriceBars);
                await this.cache.putPriceBars(priceFeed.source, cftcCommodityCode, priceBars);
                priceBars = this.selectRelevantPriceBars(priceBars, onDates);
            }
        }
        priceBars = this.postprocessPriceBars(priceBars, priceFeed);
        return priceBars;
    }

    private selectRelevantPriceBars(priceBars: PriceBar[], onlyOnDates: readonly Date[]): PriceBar[] {
        let priceBarsIdx = 0;
        let relevantPriceBars: PriceBar[] = onlyOnDates.map((timestamp) => {
            let thisBar = {
                timestamp,
                close: NaN,
            };
            let tempPriceBarsIdx = priceBarsIdx;
            while (tempPriceBarsIdx < priceBars.length && !sameDay(priceBars[tempPriceBarsIdx].timestamp, timestamp)) {
                ++tempPriceBarsIdx;
            }
            if (tempPriceBarsIdx < priceBars.length && sameDay(priceBars[tempPriceBarsIdx].timestamp, timestamp)) {
                thisBar.close = priceBars[tempPriceBarsIdx].close;
                priceBarsIdx = tempPriceBarsIdx;
            }
            return thisBar;
        });
        return relevantPriceBars;
    }

    private postprocessPriceBars(priceBars: PriceBar[], priceFeed: IPriceFeed): PriceBar[] {
        (priceFeed.transforms ?? []).forEach((transform) => {
            priceBars = transform(priceBars);
        });
        return priceBars;
    }

    private async requestExternalPriceFeed(priceFeed: IPriceFeed, since?: Date, until?: Date): Promise<PriceBar[]> {
        switch (priceFeed.source) {
            case 'FRED': {
                let series: PriceBar[] = [];
                try {
                    series = await requestFredObservations(priceFeed.symbol, since!);
                } catch (e) {
                    console.error(`Silently ignoring FRED error: ${e}`);
                }
                return series;
            }
            case 'unknown': {
                return [];
            }
            default: {
                throw new Error('should be unreachable');
            }
        }
    }
}

export class CommodityInfoDatabase {
    private idbHandle: IDBDatabase | null = null;

    private idb(): Promise<IDBDatabase> {
        if (this.idbHandle !== null) {
            return Promise.resolve(this.idbHandle);
        }
        return new Promise((resolve, reject) => {
            if (window.indexedDB == null) {
                reject(new Error('browser not supported; no IndexedDB support'));
                return;
            }
            let idbOpenRequest = window.indexedDB.open('so_libhack_cot_commodity_info', 1);
            idbOpenRequest.onupgradeneeded = (ev) => {
                const db = (ev.target as IDBRequest<IDBDatabase>).result;
                switch (ev.oldVersion) {
                    case 0: {
                        // perform initialization
                        const priceBarsStore = db.createObjectStore('priceBars', { keyPath: ['cftcCommodityCode', 'priceFeedSource'] });
                        // priceDataStore.createIndex('cftc_commodity_code_index', 'cftcCommodityCode', { unique: false });
                        // priceDataStore.createIndex('price_feed_source_index', 'priceFeedSource', { unique: false });
                        // priceDataStore.createIndex('commodity_and_source_index',
                        //     ['cftcCommodityCode', 'priceFeedSource'],
                        //     { unique: true });        
                        break;
                    }
                    default:
                        reject(new Error('should be unreachable'));
                }
            }
            idbOpenRequest.onerror = (ev) => {
                const e = (ev.target as IDBRequest<IDBDatabase>).error;
                reject(e);
            }
            idbOpenRequest.onsuccess = (ev) => {
                const db = (ev.target as IDBRequest<IDBDatabase>).result;
                this.idbHandle = db;
                db.onversionchange = () => {
                    db.close();
                    window.alert('App updated in the background. Please refresh the page.');
                    window.location.reload();
                }
                resolve(db);
            }
            idbOpenRequest.onblocked = (ev) => {
                // This shouldn't ever trigger because 'onversionchange' is handled properly.
                // This would trigger when there's another open connection to the same IndexedDB database,
                // and it wasn't closed after 'onversionchange' trigged for it.
                console.error('should be unreachable');
            }
        });
    }

    public putPriceBars(source: PriceFeedSource, cftcCommodityCode: CFTCCommodityCode, bars: PriceBar[]): Promise<void> {
        return this.idb().then((db: IDBDatabase) => {
            return new Promise((resolve, reject) => {
                const txn = db.transaction(['priceBars'], "readwrite");
                txn.onerror = (ev) => {
                    let e = (ev.target as IDBTransaction).error;
                    reject(e);
                }
                const priceBarsStore = txn.objectStore('priceBars');
                let request = priceBarsStore.put({
                    'cftcCommodityCode': cftcCommodityCode,
                    'priceFeedSource': source,
                    'bars': bars,
                });
                request.onsuccess = (ev) => {
                    let result = (ev.target as IDBRequest<IDBValidKey>).result;
                    resolve();
                }
                request.onerror = (ev) => {
                    let e = (ev.target as IDBRequest<IDBValidKey>).error;
                    reject(e);
                }
            });
        });
    }

    public appendPriceBars(source: PriceFeedSource, cftcCommodityCode: CFTCCommodityCode, bars: PriceBar[]) {
        return this.idb().then((db: IDBDatabase) => {
            return new Promise((resolve, reject) => {
                // TODO
            })
        });
    }

    public getPriceBars(source: PriceFeedSource, cftcCommodityCode: CFTCCommodityCode): Promise<PriceBar[]> {
        return this.idb().then((db: IDBDatabase) => {
            return new Promise((resolve, reject) => {
                const txn = db.transaction(['priceBars'], 'readonly');
                txn.onerror = (ev) => {
                    let e = (ev.target as IDBTransaction).error;
                    reject(e);
                }
                const priceBarsStore = txn.objectStore('priceBars');
                const request = priceBarsStore.get(IDBKeyRange.only([cftcCommodityCode, source]));
                request.onsuccess = (ev) => {
                    const result = (ev.target as IDBRequest<any>).result;
                    resolve(result == null || result['bars'] == null ? [] : result['bars'] as PriceBar[]);
                }
                request.onerror = (ev) => {
                    const e = (ev.target as IDBRequest<any>).error;
                    if (e instanceof DOMException && e.name === 'DataError') {
                        resolve([]);
                        return;
                    }
                    reject(e);
                }
            });
        });
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
        const targetDate = fitToTarget.getDate(targetData[targetIdx]);
        // advance to the next item in `src` that is closest in time to this `targetTime`
        let minimalTimeDiff = Infinity;
        for (let srcIdx2 = srcIdx; srcIdx2 < srcData.length; ++srcIdx2) {
            let maybeMinimalTimeDiff = Math.abs(src.getDate(srcData[srcIdx2]).getTime() - targetDate.getTime());
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
        const result = src.setDate(srcData[srcIdx], targetDate);
        dst.push(result);
    }

    return dst.reverse();
}