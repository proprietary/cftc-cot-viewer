import { ClientRequest } from "http";
import { iso8601StringWithNoTimezoneOffset } from "./util";

export class CachingCFTCApi {
    // Store underlying data in cache as IndexedDB

    private db: IDBDatabase | null = null;

    private socrataApi: SocrataApi;

    constructor() {
        this.socrataApi = new SocrataApi();
    }

    public init() {
        // TODO
        let dbReq: IDBOpenDBRequest = window.indexedDB.open("so_libhack_cot", 1);
        let that = this;
        if (dbReq != null) {
            dbReq.onsuccess = function (ev: Event) {
                that.db = (ev.target as IDBOpenDBRequest).result;
            };
            dbReq.onerror = function (ev: Event) {
                const req = ev.target as IDBOpenDBRequest;
                console.error('Failed to open IndexedDB');
                console.error(req.error);
                throw req.error;
            }
            dbReq.onupgradeneeded = function (ev) {
                // Create database

                const db = (ev.target as IDBOpenDBRequest).result;
                db.onerror = (ev) => {
                    console.error(ev.target);
                }

                // create ObjectStore for main records; same type of JSON object returned from the primary endpoints
                // For example: See `the structure here <https://dev.socrata.com/foundry/publicreporting.cftc.gov/gpe5-46if>`_.
                const futuresReportsStore = db.createObjectStore("futuresReports", {
                    keyPath: "id"
                });
                futuresReportsStore.createIndex("cftc_contract_market_code_idx", "cftc_contract_market_code", { unique: false });
                futuresReportsStore.createIndex("timestamp_idx", "timestamp", { unique: false });
                futuresReportsStore.createIndex("cftc_commodity_code_idx", "cftc_commodity_code", { unique: false });

                const legacyFuturesReportsStore = db.createObjectStore("legacyFuturesReports", { keyPath: "id" });
                legacyFuturesReportsStore.createIndex("timestamp_idx", "timestamp", { unique: false });
                legacyFuturesReportsStore.createIndex("cftc_contract_market_code_idx", "cftc_contract_market_code", { unique: false });
                legacyFuturesReportsStore.createIndex("timestamp_idx", "timestamp", { unique: false });

                // create ObjectStore for all the different available futures contracts
                const contractTypesStore = db.createObjectStore("commodityContracts", { keyPath: "cftcContractMarketCode" });
                contractTypesStore.createIndex("report_type_idx", "reportType", { unique: false });
                contractTypesStore.createIndex("commodity_group_name_idx", "group", { unique: false });
                contractTypesStore.createIndex("cftc_commodity_code_idx", "cftcCommodityCode", { unique: false });
            }
        }
    }

    public async requestDateRange(request: DateRangeRequest): Promise<any[]> {
        const cached = await this.getCachedDateRange(request);
        if (cached.length === 0) {
            const newData = await this.socrataApi.fetchDateRange(request);
            await this.storeFuturesRecords(newData);
            return newData;
        } else {
            return cached;
        }
    }

    public async requestCommodityContracts(request: ContractListRequest): Promise<CommodityContractKind[]> {
        const cached = await this.getCachedContracts(request);
        if (cached.length === 0) {
            const availableContracts = await this.socrataApi.fetchAvailableContracts(request);
            await this.storeContracts(availableContracts);
            return availableContracts;
        } else {
            return cached;
        }
    }

    private getCachedDateRange(request: DateRangeRequest): Promise<any[]> {
        if (this.db == null) {
            return Promise.resolve([]);
        }
        const tx = this.db.transaction(["futuresReports"], "readonly");
        const objectStore = tx.objectStore("futuresReports");
        const cftcContractMarketCodeIndex = objectStore.index("cftc_contract_market_code_idx")
        return new Promise((resolve, reject) => {
            let resultSet: Array<any> = [];
            const req = cftcContractMarketCodeIndex.openCursor(request.contract.cftcContractMarketCode);
            req.onerror = (ev) => {
                const err = (ev.target as IDBRequest<IDBCursor>).error;
                console.error(err);
                reject(err);
            }
            req.onsuccess = (ev) => {
                const cursor = (ev.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor != null) {
                    if (cursor.value['timestamp'] >= request.startDate.getTime() && cursor.value['timestamp'] <= request.endDate.getTime()) {
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

    private storeFuturesRecords(payload: any[]): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.db == null) {
                reject();
                return;
            }
            const tx = this.db.transaction(["futuresReports"], "readwrite");
            tx.oncomplete = (ev) => {
                resolve();
            }
            tx.onerror = (ev) => {
                const e = (ev.target as IDBTransaction).error;
                console.error(e);
                reject(e);
            }
            const objectStore = tx.objectStore("futuresReports");
            for (const record of payload) {
                // validate that it was postprocessed
                if (!Object.hasOwn(record, 'timestamp')) {
                    reject(new Error('futures report item was not preprocessed'));
                }
                const txReq = objectStore.add(record);
                txReq.onsuccess = (ev) => {
                    const insertedKey = (ev.target as IDBRequest).result;
                    if (insertedKey !== record['id']) {
                        reject(new Error('assertion failure: IndexedDB did not insert key as expected'));
                    }
                }
            }
        });
    }

    private storeContracts(payload: CommodityContractKind[]): Promise<void> {
        if (this.db == null) {
            return Promise.reject();
        }
        return new Promise((resolve, reject) => {
            if (this.db == null) {
                reject();
                return;
            }
            const tx = this.db.transaction(["commodityContracts"], "readwrite");
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

    private getCachedContracts(request: ContractListRequest): Promise<CommodityContractKind[]> {
        return new Promise((resolve, reject) => {
            if (this.db == null) {
                reject(new Error('IndexedDB not initialized'));
                return;
            }
            const tx = this.db.transaction(["commodityContracts"], "readonly");
            tx.onerror = (ev) => {
                const e = (ev.target as IDBTransaction).error;
                console.error(e);
                reject(e);
            };
            const commodityContracts = tx.objectStore("commodityContracts");
            const req = commodityContracts.openCursor(request.reportType);
            let dst: CommodityContractKind[] = [];
            req.onsuccess = (ev) => {
                const cursor = (ev.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor != null) {
                    if (cursor.value['reportType'] !== request.reportType) {
                        let e = new Error("assertion failure: `reportType` retrieved is not what we asked for");
                        console.error(e);
                        reject(e);
                        return;
                    }
                    dst.push(cursor.value);
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

enum CFTCReportType {
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

interface CommodityContractKind {
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
        if (request.contract.group == null) {
            throw new Error();
        }
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
            'trim(cftc_commodity_code) AS cftc_commodity_code',
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
            '$select': selectColumns.join(','),
            '$group': selectColumns.join(','),
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
        })
    }
}