import { CommodityCodes } from './cftc_codes_mapping';
import { requestFredSeries } from './fred_api';
import { PriceBar, IPriceFeed, PriceFeedSource, CFTCCommodityCode } from './common_types';
import { sameDay } from './util';

export class CommodityInfoService {
    private cache: CommodityInfoDatabase = new CommodityInfoDatabase();

    public async requestPriceFeed(cftcCommodityCode: CFTCCommodityCode, priceFeed: IPriceFeed, onDates: Date[]): Promise<PriceBar[]> {
        if (onDates.length === 0) {
            throw new Error();
        }
        const uptoDate = onDates[onDates.length - 1];
        let priceBars = await this.cache.getPriceBars(priceFeed.source, cftcCommodityCode);
        if (priceBars.length === 0 || priceBars.at(-1)!.timestamp.getTime() >= uptoDate.getTime()) {
            priceBars = await this.requestExternalPriceFeed(priceFeed, uptoDate);
            priceBars = this.removeUnnecessaryPriceBars(priceBars, onDates);
            await this.cache.addPriceBars(priceFeed.source, cftcCommodityCode, priceBars);
        }
        priceBars = this.postprocessPriceBars(priceBars, priceFeed);
        return priceBars;
    }

    private removeUnnecessaryPriceBars(priceBars: PriceBar[], onlyOnDates: readonly Date[]): PriceBar[] {
        if (priceBars.length < onlyOnDates.length) {
            throw new Error('Not enough price history retrieved');
        }
        priceBars.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const onDates_ = [...onlyOnDates].sort((a, b) => a.getTime() - b.getTime());
        let selectedPriceBars: PriceBar[] = new Array<PriceBar>(onDates_.length);
        for (let i = 0; i < onDates_.length; ++i) {
            let j = i;
            while (j < priceBars.length && !sameDay(priceBars[j].timestamp, onDates_[i])) {
                j++;
            }
            if (j < priceBars.length) selectedPriceBars[i] = priceBars[j];
        }
        priceBars = selectedPriceBars;
        return priceBars;
    }

    private postprocessPriceBars(priceBars: PriceBar[], priceFeed: IPriceFeed): PriceBar[] {
        for (const transform of (priceFeed.transforms ?? [])) {
            priceBars = transform(priceBars);
        }
        return priceBars;
    }

    private async requestExternalPriceFeed(priceFeed: IPriceFeed, since?: Date, until?: Date): Promise<PriceBar[]> {
        switch (priceFeed.source) {
            case 'FRED': {
                const series = await requestFredSeries(priceFeed.symbol, since!);
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
                        const priceDataStore = db.createObjectStore('priceBars', { keyPath: ['cftcCommodityCode', 'priceFeedSource'] });
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

    public addPriceBars(source: PriceFeedSource, cftcCommodityCode: CFTCCommodityCode, bars: PriceBar[]): Promise<void> {
        return this.idb().then((db: IDBDatabase) => {
            return new Promise((resolve, reject) => {
                const txn = db.transaction(['priceBars'], "readwrite");
                txn.onerror = (ev) => {
                    let e = (ev.target as IDBTransaction).error;
                    reject(e);
                }
                const priceDataStore = txn.objectStore('priceBars');
                let request = priceDataStore.put({
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

    public getPriceBars(source: PriceFeedSource, cftcCommodityCode: CFTCCommodityCode): Promise<PriceBar[]> {
        return this.idb().then((db: IDBDatabase) => {
            return new Promise((resolve, reject) => {
                const txn = db.transaction(['priceBars'], 'readonly');
                txn.onerror = (ev) => {
                    let e = (ev.target as IDBTransaction).error;
                    reject(e);
                }
                const priceDataStore = txn.objectStore('priceBars');
                const request = priceDataStore.get(IDBKeyRange.only([cftcCommodityCode, source]));
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