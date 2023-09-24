import { daysDiff, iso8601StringWithNoTimezoneOffset, plusDays } from "./util";
import { ISocrataCOTReport, IFinancialFuturesCOTReport, IDisaggregatedFuturesCOTReport, ILegacyFuturesCOTReport, IAnyCOTReportType } from "./socrata_cot_report";
import { SocrataApi } from "./lib/socrata_api";
import { CommodityContractKind } from "./lib/CommodityContractKind";
import { CFTCReportType } from "./common_types";

export class CachingCFTCApi {
    // Store underlying data in cache as IndexedDB

    private db: IDBDatabase | null = null;

    private dbHandle: Promise<IDBDatabase>;

    private socrataApi: SocrataApi;

    constructor() {
        this.socrataApi = new SocrataApi();
        this.dbHandle = this.initIndexedDB();
    }

    private initIndexedDB(): Promise<IDBDatabase> {
        let that = this;
        return new Promise((resolve, reject) => {
            const dbReq = window.indexedDB.open("so_libhack_cot", 1);
            if (dbReq != null) {
                dbReq.onsuccess = function (ev: Event) {
                    const db = (ev.target as IDBOpenDBRequest).result;
                    that.db = db;
                    that.dbHandle = Promise.resolve(db);
                    resolve(db);
                };
                dbReq.onerror = function (ev: Event) {
                    const req = ev.target as IDBOpenDBRequest;
                    console.error('Failed to open IndexedDB');
                    console.error(req.error);
                    reject(req.error);
                }
                dbReq.onupgradeneeded = function (ev: Event) {
                    // Create database

                    const db = (ev.target as IDBOpenDBRequest).result;
                    db.onerror = (ev) => {
                        console.error(ev.target);
                        reject();
                    }

                    // create ObjectStore for main records; same type of JSON object returned from the primary endpoints
                    // For example: See `the structure here <https://dev.socrata.com/foundry/publicreporting.cftc.gov/gpe5-46if>`_.

                    // Maintain 3 different `ObjectStore`s for each of the 3 types of CFTC reports:
                    // - TFF (Traders in Financial Futures)
                    // - Disaggregated Reports (Agriculture & Natural Resources)
                    // - Legacy COT (traditional COT with only major trader categories being comms and non-comms)

                    // TFF ObjectStore
                    const tffStore = db.createObjectStore(that.objectStoreNameFor(CFTCReportType.FinancialFutures), { keyPath: "id" });
                    tffStore.createIndex("cftc_contract_market_code_idx", "cftc_contract_market_code", { unique: false });
                    tffStore.createIndex("timestamp_idx", "timestamp", { unique: false });

                    // Disaggregated (Agriculture & Natural Resources) ObjectStore
                    const disaggregatedStore = db.createObjectStore(that.objectStoreNameFor(CFTCReportType.Disaggregated), { keyPath: "id" });
                    disaggregatedStore.createIndex("cftc_contract_market_code_idx", "cftc_contract_market_code", { unique: false });
                    disaggregatedStore.createIndex("timestamp_idx", "timestamp", { unique: false });

                    // Legacy ObjectStore
                    const legacyFuturesReportsStore = db.createObjectStore(that.objectStoreNameFor(CFTCReportType.Legacy), { keyPath: "id" });
                    legacyFuturesReportsStore.createIndex("cftc_contract_market_code_idx", "cftc_contract_market_code", { unique: false });
                    legacyFuturesReportsStore.createIndex("timestamp_idx", "timestamp", { unique: false });

                    // create ObjectStore for all the different available futures contracts
                    const contractTypesStore = db.createObjectStore("commodityContracts", { keyPath: "cftcContractMarketCode" });
                    // rather than making a new `ObjectStore` for each report type, each entry is a tagged struct with `reportType`:
                    contractTypesStore.createIndex("report_type_idx", "reportType", { unique: false });
                    contractTypesStore.createIndex("commodity_group_name_idx", "group", { unique: false });
                    contractTypesStore.createIndex("cftc_commodity_code_idx", "cftcCommodityCode", { unique: false });
                }
            }
        });
    }

    private objectStoreNameFor(reportType: CFTCReportType): string {
        switch (reportType) {
            case CFTCReportType.Disaggregated:
                return "disaggregatedReports";
            case CFTCReportType.FinancialFutures:
                return "tffReports";
            case CFTCReportType.Legacy:
                return "legacyFuturesReports";
            default:
                throw new Error();
        }
    }

    public async requestDateRange(request: DateRangeRequest): Promise<IAnyCOTReportType[]> {
        const cached: IAnyCOTReportType[] = await this.getCachedDateRange(request);
        if (cached == null || cached.length === 0) {
            // cache is empty
            const newData = await this.socrataApi.fetchDateRange(request);
            await this.storeFuturesRecords(request.reportType, newData);
            return newData;
        }
        // can we use the cache? let's find out...
        let dst = [...cached];
        dst.sort((a: IAnyCOTReportType, b: IAnyCOTReportType) => a['timestamp'] - b['timestamp']);
        const oldest = dst[0];
        const youngest = dst[dst.length - 1];
        // check if the cache is missing older data
        if (request.startDate.getTime() < oldest['timestamp'] &&
            /* check if this is a "dinosaur" which means there are no older entries (begining of history of the dataset) */
            !(oldest.hasOwnProperty('dinosaur') && oldest['dinosaur'] === true)) {
            let missingOlderData = await this.socrataApi.fetchDateRange({
                ...request,
                startDate: request.startDate,
                // subtract 1 day to not re-retrieve a record, because third-party API's date lookup fxn is inclusive
                endDate: plusDays(new Date(oldest['timestamp']), -1),
            });
            if (missingOlderData != null && missingOlderData.length === 0) {
                // we reached the beginning of this time series
                // add "dinosaur" to the stored series so future callers know not to request from the third-party API again
                await this.setDinosaur(request.reportType, oldest['id']);
            } else if (missingOlderData != null && missingOlderData.length > 0) {
                await this.storeFuturesRecords(request.reportType, missingOlderData);
                missingOlderData.sort((a: any, b: any) => a['timestamp'] - b['timestamp']);
                dst = dst.concat(missingOlderData);
                const nowOldest = missingOlderData[0];
                if (nowOldest['timestamp'] > request.startDate.getTime()) {
                    // we reached the beginning of this time series
                    // add "dinosaur" to the stored series so future callers know not to look again
                    await this.setDinosaur(request.reportType, nowOldest['id']);
                }
            } else {
                throw new Error(`Request for missing older data returned null`);
            }
        }
        // check if the cache is missing the most recent data
        if (request.endDate.getTime() > youngest['timestamp']) {
            // is there a Friday at 12:30pm PDT (when the CFTC releases a new report) between the youngest entry and "the end date"
            let youngestReportDateTime = new Date(youngest['timestamp']);
            youngestReportDateTime.setUTCHours(19, 30, 0, 0);
            const daysBetween = daysDiff(request.endDate, youngestReportDateTime);
            // `request.endDate` is the Tuesday on the same week as the report (released Fri)
            // so check whether 7+3=10 days have passed
            const newReportWasIntervening: boolean = daysBetween >= 10.0;
            if (newReportWasIntervening === true) {
                const missingNewerData = await this.socrataApi.fetchDateRange({
                    ...request,
                    startDate: new Date(youngest['timestamp']),
                    endDate: request.endDate,
                });
                if (missingNewerData != null && missingNewerData.length > 0) {
                    await this.storeFuturesRecords(request.reportType, missingNewerData);
                    dst = dst.concat(missingNewerData);
                }
            }
        }
        return dst.sort((a: any, b: any) => a['timestamp'] - b['timestamp']);
    }

    public async requestCommodityContracts(request: ContractListRequest): Promise<CommodityContractKind[]> {
        const cached = await this.getCachedContracts(request);
        if (cached == null || cached.length === 0) {
            const availableContracts = await this.socrataApi.fetchAvailableContracts(request);
            await this.storeContracts(availableContracts);
            return availableContracts;
        } else {
            return cached;
        }
    }

    private async setDinosaur(reportType: CFTCReportType, id: string): Promise<void> {
        const db = await this.dbHandle;
        let report = await this.getReport(reportType, id);
        report['dinosaur'] = true;
        return new Promise((resolve, reject) => {
            const objectStoreName = this.objectStoreNameFor(reportType);
            const txn = db.transaction(objectStoreName, "readwrite");
            txn.oncomplete = (ev) => {
                resolve();
            }
            txn.onerror = (ev) => {
                const e = (ev.target as IDBTransaction).error;
                reject(e);
            }
            const os = txn.objectStore(objectStoreName);
            const req = os.put(report);
            req.onsuccess = (ev) => {
                resolve();
            }
            req.onerror = (ev) => {
                reject();
            }
        });
    }

    private async getReport(reportType: CFTCReportType, id: string): Promise<any> {
        if (id == null || id.length === 0) {
            console.error(`Missing "id" in futures COT report lookup`);
            return Promise.reject();
        }
        const db = await this.dbHandle;
        const objectStoreName = this.objectStoreNameFor(reportType);
        return new Promise((resolve, reject) => {
            let result: any = {};
            const txn = db.transaction(objectStoreName);
            txn.oncomplete = (ev) => {
                resolve(result);
            }
            txn.onerror = (ev) => {
                const e = (ev.target as IDBTransaction).error;
                reject(e);
            }
            const os = txn.objectStore(objectStoreName);
            const req = os.get(id);
            req.onsuccess = (ev) => {
                const result_ = (ev.target as IDBRequest).result;
                result = result_;
                resolve(result_);
            }
            req.onerror = (ev) => {
                const e = (ev.target as IDBRequest).error;
                reject(e);
            }
        })
    }

    private async getCachedDateRange(request: DateRangeRequest): Promise<IAnyCOTReportType[]> {
        const db = await this.dbHandle;
        return new Promise((resolve, reject) => {
            let resultSet: Array<IAnyCOTReportType> = [];
            const objectStoreName = this.objectStoreNameFor(request.reportType);
            const tx = db.transaction([objectStoreName], "readonly");
            const req = tx
                .objectStore(objectStoreName)
                .index("cftc_contract_market_code_idx")
                .openCursor();
            req.onerror = (ev) => {
                const err = (ev.target as IDBRequest<IDBCursor>).error;
                console.error(err);
                reject(err);
            }
            req.onsuccess = (ev) => {
                const cursor = (ev.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor != null) {
                    if (cursor.value['cftc_contract_market_code'] === request.contract.cftcContractMarketCode &&
                        cursor.value['timestamp'] >= request.startDate.getTime() &&
                        cursor.value['timestamp'] <= request.endDate.getTime()) {
                        resultSet.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    // sort by datetime in ascending order
                    resultSet.sort((a, b) => a['timestamp'] - b['timestamp']);
                    resolve(resultSet);
                }
            }
        });
    }

    private async storeFuturesRecords(reportType: CFTCReportType, payload: IAnyCOTReportType[]): Promise<void> {
        const db = await this.dbHandle;
        const objectStoreName = this.objectStoreNameFor(reportType);
        return new Promise((resolve, reject) => {
            if (db == null) {
                reject();
                return;
            }
            const tx = db.transaction([objectStoreName], "readwrite");
            tx.onerror = (ev) => {
                const e = (ev.target as IDBTransaction).error;
                reject(e);
            }
            const objectStore = tx.objectStore(objectStoreName);
            for (const record of payload) {
                // validate that it was postprocessed
                if (record == null || !record.hasOwnProperty('timestamp')) {
                    reject(new Error('futures report item was not preprocessed'));
                }
                const txReq = objectStore.put(record);
                txReq.onsuccess = (ev) => {
                    const insertedKey = (ev.target as IDBRequest<IDBValidKey>).result;
                    if (insertedKey !== record['id']) {
                        reject(new Error('assertion failure: IndexedDB did not insert key as expected'));
                    }
                }
                txReq.onerror = (ev) => {
                    const e = (ev.target as IDBRequest<IDBValidKey>).error;
                    reject(e);
                }
            }
            resolve();
        });
    }

    private async storeContracts(payload: CommodityContractKind[]): Promise<void> {
        const db = await this.dbHandle;
        return new Promise((resolve, reject) => {
            if (db == null) {
                reject();
                return;
            }
            const tx = db.transaction(["commodityContracts"], "readwrite");
            tx.oncomplete = (ev) => {
                resolve();
            }
            tx.onerror = (ev) => {
                reject(tx.error);
            }
            const commodityContracts = tx.objectStore("commodityContracts");
            for (const entry of payload) {
                const insertRequest = commodityContracts.add(entry);
                insertRequest.onsuccess = (ev) => {
                    const validKey = (ev.target as IDBRequest<IDBValidKey>).result;
                    if (validKey !== entry['cftcContractMarketCode']) {
                        reject(new Error('assertion failure: IndexedDB did not insert key as expected'));
                    }
                }
            }
        });
    }

    private async getCachedContracts(request: ContractListRequest): Promise<CommodityContractKind[]> {
        const db = await this.dbHandle;
        return new Promise((resolve, reject) => {
            if (db == null) {
                reject(new Error('IndexedDB not initialized'));
                return;
            }
            let dst: CommodityContractKind[] = [];
            const tx = db.transaction(["commodityContracts"], "readonly");
            tx.onerror = (ev) => {
                const e = (ev.target as IDBTransaction).error;
                console.error(e);
                reject(e);
            };
            tx.oncomplete = (ev) => {
                console.warn(ev);
                resolve(dst);
            }
            const commodityContracts = tx.objectStore("commodityContracts");
            const reportTypeIndex = commodityContracts.index("report_type_idx");
            const req = reportTypeIndex.openCursor();
            req.onsuccess = (ev) => {
                const cursor = (ev.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor != null) {
                    if (cursor.value['reportType'] === request.reportType) {
                        dst.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(dst);
                }
            };
            req.onerror = (ev) => {
                const e = (ev.target as IDBRequest<IDBCursorWithValue>).error;
                console.error(e);
                reject(e);
            }
        });
    }
}

export interface DateRangeRequest {
    reportType: CFTCReportType,
    contract: CommodityContractKind,
    startDate: Date,
    endDate: Date,
}

export interface ContractListRequest {
    reportType: CFTCReportType,
}

