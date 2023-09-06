import { daysDiff, iso8601StringWithNoTimezoneOffset } from "./util";

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
                console.info("dbReq != null");
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

    public async requestDateRange(request: DateRangeRequest): Promise<any[]> {
        const cached = await this.getCachedDateRange(request);
        if (cached == null || cached.length === 0) {
            // cache is empty
            const newData = await this.socrataApi.fetchDateRange(request);
            await this.storeFuturesRecords(request.reportType, newData);
            return newData;
        }
        // can we use the cache? let's find out...
        let dst = [...cached];
        dst.sort((a: any, b: any) => a['timestamp'] - b['timestamp']);
        const oldest = dst[0]['timestamp'];
        const youngest = dst[dst.length - 1]['timestamp'];
        // check if the cache is missing older data
        if (request.startDate.getTime() < oldest) {
            let missingOlderData = await this.socrataApi.fetchDateRange({
                ...request,
                startDate: request.startDate,
                endDate: new Date(oldest),
            });
            if (missingOlderData != null && missingOlderData.length > 0) {
                await this.storeFuturesRecords(request.reportType, missingOlderData);
                missingOlderData.sort((a: any, b: any) => a['timestamp'] - b['timestamp']);
                const nowOldest = missingOlderData[0]['timestamp'];
                if (nowOldest > request.startDate.getTime()) {
                    // we reached the beginning of this time series
                    // notify caller that this is it and it's over

                }
                dst = dst.concat(missingOlderData);
            }
        }
        // check if the cache is missing the most recent data
        if (request.endDate.getTime() > youngest) {
            // is there a Friday at 12:30pm EDT (when the CFTC releases a new report) between the youngest entry and "the end date"
            const daysBetween = daysDiff(request.endDate, new Date(youngest));
            const newReportWasIntervening: boolean = daysBetween >= 7.0;
            if (newReportWasIntervening === true) {
                const missingNewerData = await this.socrataApi.fetchDateRange({
                    ...request,
                    startDate: new Date(youngest),
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

    private async getCachedDateRange(request: DateRangeRequest): Promise<any[]> {
        const db = await this.dbHandle;
        return new Promise((resolve, reject) => {
            let resultSet: Array<any> = [];
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

    private async storeFuturesRecords(reportType: CFTCReportType, payload: any[]): Promise<void> {
        const db = await this.dbHandle;
        const objectStoreName = this.objectStoreNameFor(reportType);
        return new Promise((resolve, reject) => {
            if (db == null) {
                reject();
                return;
            }
            const tx = db.transaction([objectStoreName], "readwrite");
            const objectStore = tx.objectStore(objectStoreName);
            for (const record of payload) {
                // validate that it was postprocessed
                if (!Object.hasOwn(record, 'timestamp')) {
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

export enum CFTCReportType {
    FinancialFutures, // traders in financial futures -- five classifications: Dealer, Asset Manager, Leveraged Money, Other Reportables and Non-Reportables
    Disaggregated, // agriculture and natural resources -- Producer/Merchant, Swap Dealers, Managed Money and Other Reportables
    Legacy, // old-school report broken down by exchange with reported open interest further broken down into three trader classifications: commercial, non-commercial and non-reportable
}

enum CFTCCommodityGroupType {
    Financial = "FINANCIAL INSTRUMENTS", // Traders in Financial Futures
    NaturalResources = "NATURAL RESOURCES", // Disaggregated: natural resources
    Agriculture = "AGRICULTURE", // Disaggregated: agriculture
}

type CFTCContractMarketCode = string;

export interface CommodityContractKind {
    // This must be distinct.
    cftcContractMarketCode: CFTCContractMarketCode;

    reportType: CFTCReportType,

    group?: CFTCCommodityGroupType;

    // location of where it's traded, e.g., NYC
    cftcRegionCode?: string;

    // name of the exchange
    cftcMarketCode?: string;

    // Distinct code for a specific commodity. For example, crude oil is always "067", and contracts with WTI or Brent both have "067".
    cftcCommodityCode?: string;

    // e.g., NATURAL GAS AND PRODUCTS
    commoditySubgroupName?: string;

    cftcSubgroupCode?: string;

    // e.g., BUTANE OPIS MT BELV NONTET FP  - ICE FUTURES ENERGY DIV
    marketAndExchangeNames?: string;

    // name of the contract itself, e.g., E-mini S&P 500
    contractMarketName?: string;

    // e.g., NATURAL GAS LIQUIDS
    commodityName?: string;
}

class SocrataApi {
    private appToken: string = '';

    public async fetchDateRange(request: DateRangeRequest): Promise<any[]> {
        /* 
        curl -X GET -G 'https://publicreporting.cftc.gov/resource/gpe5-46if.json' \
        --data-urlencode "\$limit=1000" \
        --data-urlencode "\$offset=0" \
        --data-urlencode "\$where=cftc_contract_market_code='020601' and report_date_as_yyyy_mm_dd between '2022-02-01T08:00:00.000' and '2022-06-01T07:00:00.000'" \
        --compressed
        */
        const startDateStr = iso8601StringWithNoTimezoneOffset(request.startDate);
        const endDateStr = iso8601StringWithNoTimezoneOffset(request.endDate);
        let baseUrl: string = '';
        if (request.reportType === CFTCReportType.FinancialFutures) {
            baseUrl = 'https://publicreporting.cftc.gov/resource/gpe5-46if.json';
        } else if (request.reportType === CFTCReportType.Disaggregated) {
            baseUrl = 'https://publicreporting.cftc.gov/resource/72hh-3qpy.json';
        } else if (request.reportType === CFTCReportType.Legacy) {
            baseUrl = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json';
        } else {
            throw new Error('unreachable!');
        }
        let dst: any[] = [];
        let offset = 0;
        let limit = 10000;
        let got = 0;
        do {
            let params = new URLSearchParams({
                '$where': `cftc_contract_market_code='${request.contract.cftcContractMarketCode}' and report_date_as_yyyy_mm_dd between '${startDateStr}' and '${endDateStr}'`,
                '$limit': limit.toString(),
                '$offset': offset.toString(),
            });
            if (this.appToken.length > 0) {
                params.set('$$app_token', this.appToken);
            }
            let req = new Request(baseUrl + '?' + params.toString(), {
                method: 'GET',
            });
            let resp = await fetch(req);
            if (resp.status !== 200) {
                throw new Error(await resp.text());
            }
            let j: any[] = await resp.json();
            got = j.length;
            offset += got;
            dst = dst.concat(j);
        } while (got >= limit);
        return SocrataApi.postprocessSocrataApiRecords(dst);
    }

    public fetchAvailableContracts(request: ContractListRequest): Promise<CommodityContractKind[]> {
        /*
        Example:
        
        % curl -X GET -G 'https://publicreporting.cftc.gov/resource/72hh-3qpy.json' \
             --data-urlencode "\$select=cftc_contract_market_code,market_and_exchange_names,commodity_name,trim(cftc_co as cftc_commodity_code,cftc_region_code,cftc   codommodity,co,commodity_subgroup_name,commodity_group_name,max(report_date_as_yyyy_mm_dd)" \
             --data-urlencode "\$where=commodity_group_name='NATURAL RESOURCES'" \
             --data-urlencode "\$group=cftc_contract_market_code,market_and_exchange_names,commodity_name,cftc_commodity_code,cftc_region_code,cftc_subgroup_code,commodity,commodity_subgroup_name,commodity_group_name" \
             --data-urlencode "\$having=max(report_date_as_yyyy_mm_dd) > '2023-06-07T12:35:01'" \
             --data-urlencode "\$limit=10000" \
             --compressed | \
            tee /tmp/cftc.json | \
            jq length
        */
        const selectColumns = [
            'cftc_contract_market_code',
            'market_and_exchange_names',
            'commodity_name',
            'cftc_market_code',
            'cftc_region_code',
            'cftc_subgroup_code',
            'commodity',
            'commodity_subgroup_name',
            'commodity_group_name',
        ];
        let req: Request | null = null;
        let earliestTolerated: Date | string = new Date(new Date().getTime() - (1000 * 60 * 60 * 24) * 90 /* days */);
        earliestTolerated = iso8601StringWithNoTimezoneOffset(earliestTolerated);
        // determine API url based on type of COT report
        let baseUrl: string = '';
        // Disaggregated
        if (request.reportType === CFTCReportType.Disaggregated) {
            baseUrl = "https://publicreporting.cftc.gov/resource/72hh-3qpy.json";
        } else if (request.reportType === CFTCReportType.FinancialFutures) {
            // Traders in Financial Futures
            baseUrl = "https://publicreporting.cftc.gov/resource/gpe5-46if.json";
        } else if (request.reportType === CFTCReportType.Legacy) {
            // Legacy COT
            baseUrl = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";
        } else {
            throw new Error('unreachable!');
        }
        let params = new URLSearchParams({
            '$select': [...selectColumns, 'trim(cftc_commodity_code) AS cftc_commodity_code'].join(','),
            '$group': [...selectColumns, 'cftc_commodity_code'].join(','),
            // exclude defunct contracts
            '$having': `max(report_date_as_yyyy_mm_dd) > '${earliestTolerated}'`,
            '$limit': '10000',
        });
        if (this.appToken.length > 0) {
            params.set('$$appToken', this.appToken);
        }
        req = new Request(baseUrl + '?' + params, {
            method: 'GET',
        });
        if (req == null) {
            throw new Error();
        }
        return fetch(req)
            .then((resp) => resp.json())
            .then(lst => SocrataApi.parseFromSocrataApi(lst, request.reportType));
    }

    private static parseFromSocrataApi(payload: any[], reportType: CFTCReportType): CommodityContractKind[] {
        let dst = payload.map((row: any): CommodityContractKind => ({
            reportType,
            cftcContractMarketCode: row['cftc_contract_market_code'] as CFTCContractMarketCode,
            marketAndExchangeNames: row['market_and_exchange_names'],
            commodityName: row['commodity_name'],
            cftcMarketCode: row['cftc_market_code'],

            // sometimes this col shows up from Socrata with a trailing space
            cftcCommodityCode: row['cftc_commodity_code'].trim(),

            cftcSubgroupCode: row['cftc_subgroup_code'],
            commoditySubgroupName: row['commodity_subgroup_name'],
            group: row['commodity_group_name'],
        }));
        // dedupe because Socrata returns some duplicates
        // use cftc contract market codes, because that must uniquely identify the type of futures contract
        let cftcContractMarketCodes = new Set<CFTCContractMarketCode>();
        dst = dst.filter((value: CommodityContractKind) => {
            if (!cftcContractMarketCodes.has(value.cftcContractMarketCode)) {
                cftcContractMarketCodes.add(value.cftcContractMarketCode);
                return true;
            }
            return false;
        });
        return dst;
    }

    private static postprocessSocrataApiRecords(payload: any[]): any[] {
        return payload.map((record: any) => {
            // add an integer UNIX timestamp for convenience
            record['timestamp'] = Date.parse(record['report_date_as_yyyy_mm_dd']);
            // remove trailing/leading whitespace
            for (const k of Object.keys(record)) {
                if (typeof record[k] === 'string') {
                    record[k] = record[k].trim();
                }
            }
            return record;
        });
    }
}