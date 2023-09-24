import { IAnyCOTReportType } from "../socrata_cot_report";
import { DateRangeRequest, ContractListRequest } from "../cftc_api";
import { CFTCContractMarketCode, CFTCReportType, CFTCCommodityGroupType } from "../common_types";
import { CommodityContractKind } from "./CommodityContractKind";


export class SocrataApi {
    private appToken_: string = '';

    public set appToken(appToken_: string) {
        this.appToken_ = appToken_;
    }

    public async fetchDateRange(request: DateRangeRequest): Promise<IAnyCOTReportType[]> {
        /*
        curl -X GET -G 'https://publicreporting.cftc.gov/resource/gpe5-46if.json' \
        --data-urlencode "\$limit=1000" \
        --data-urlencode "\$offset=0" \
        --data-urlencode "\$where=cftc_contract_market_code='020601' and report_date_as_yyyy_mm_dd between '2022-02-01T08:00:00.000' and '2022-06-01T07:00:00.000'" \
        --compressed
        */
        const startDateStr = SocrataApi.formatFloatingTimestamp(request.startDate);
        const endDateStr = SocrataApi.formatFloatingTimestamp(request.endDate);
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
        let dst: IAnyCOTReportType[] = [];
        let offset = 0;
        let limit = 10000;
        let got = 0;
        do {
            let params = new URLSearchParams({
                '$where': `cftc_contract_market_code='${request.contract.cftcContractMarketCode}' and report_date_as_yyyy_mm_dd between '${startDateStr}' and '${endDateStr}'`,
                '$limit': limit.toString(),
                '$offset': offset.toString(),
            });
            if (this.appToken_.length > 0) {
                params.set('$$app_token', this.appToken_);
            }
            let req = new Request(baseUrl + '?' + params.toString(), {
                method: 'GET',
            });
            let resp = await fetch(req);
            if (resp.status !== 200) {
                throw new Error(await resp.text());
            }
            let j: IAnyCOTReportType[] = await resp.json();
            got = j.length;
            offset += got;
            dst = dst.concat(j);
        } while (got >= limit);
        return SocrataApi.postprocessSocrataApiRecords(dst);
    }

    public async fetchAvailableContracts(request: ContractListRequest): Promise<CommodityContractKind[]> {
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
        let selectColumns = [
            'cftc_contract_market_code',
            'market_and_exchange_names',
            'contract_market_name',
            'commodity_name',
            'cftc_market_code',
            'cftc_region_code',
            'commodity',
            'commodity_subgroup_name',
            'commodity_group_name',
        ];
        let req: Request | null = null;
        // reject futures contracts with no updates in the past `oldestToleratedContractsInDays` days
        const oldestToleratedContractsInDays = 90;
        let minContractDate = new Date();
        minContractDate.setUTCDate(minContractDate.getUTCDate() - oldestToleratedContractsInDays);
        // determine API url based on type of COT report
        let baseUrl: string = '';
        switch (request.reportType) {
            // Disaggregated
            case CFTCReportType.Disaggregated:
                baseUrl = "https://publicreporting.cftc.gov/resource/72hh-3qpy.json";
                selectColumns.push('cftc_subgroup_code');
                break;
            // Traders in Financial Futures
            case CFTCReportType.FinancialFutures:
                baseUrl = "https://publicreporting.cftc.gov/resource/gpe5-46if.json";
                selectColumns.push('cftc_subgroup_code');
                break;
            // Legacy COT
            case CFTCReportType.Legacy:
                baseUrl = "https://publicreporting.cftc.gov/resource/6dca-aqww.json";
                break;
            default:
                throw new Error('unreachable!');
        }
        let params = new URLSearchParams({
            '$select': [...selectColumns, 'trim(cftc_commodity_code) AS cftc_commodity_code'].join(','),
            '$group': [...selectColumns, 'cftc_commodity_code'].join(','),
            '$where': `futonly_or_combined='FutOnly'`,
            // exclude defunct contracts
            '$having': `max(report_date_as_yyyy_mm_dd) > '${SocrataApi.formatFloatingTimestamp(minContractDate)}'`,
            '$limit': '10000', // shouldn't need more than one pass with 10k possible results
        });
        if (this.appToken_.length > 0) {
            params.set('$$appToken', this.appToken_);
        }
        const resp = await fetch(baseUrl + '?' + params, {
            method: 'GET',
        });
        if (resp.status !== 200) {
            console.error(`${resp.status} ${resp.statusText}`);
            console.error(await resp.text());
            return [];
        }
        const apiResult = await resp.json();
        return apiResult.map((row: any): CommodityContractKind => {
            let dst = {
                reportType: request.reportType,
                cftcContractMarketCode: row['cftc_contract_market_code'] as CFTCContractMarketCode,
                marketAndExchangeNames: row['market_and_exchange_names'],
                commodityName: row['commodity_name'],
                cftcMarketCode: row['cftc_market_code'],
                cftcRegionCode: row['cftc_region_code'],
                contractMarketName: row['contract_market_name'],
                commodity: row['commodity'],
                cftcCommodityCode: row['cftc_commodity_code'],
                cftcSubgroupCode: request.reportType !== CFTCReportType.Legacy ? row['cftc_subgroup_code'] : null,
                commoditySubgroupName: row['commodity_subgroup_name'],
                group: row['commodity_group_name'] as CFTCCommodityGroupType,
            };
            return dst;
        });
    }

    private static postprocessSocrataApiRecords(payload: any[]): IAnyCOTReportType[] {
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
        }).sort((a: any, b: any) => a['timestamp'] - b['timestamp']);
    }

    /// Format a timestamp in a format that Socrata's SoQL accepts.
    /// "Floating timestamps represent an instant in time with millisecond precision, with no timezone value, encoded as ISO8601 Times with no timezone offset. When writing data, accuracy to only the second is required, but the service will always return precision to the millisecond.
    // For example: "2014-10-13T00:00:00.000"
    /// See: https://dev.socrata.com/docs/datatypes/floating_timestamp.html#,
    private static formatFloatingTimestamp(d: Date): string {
        return d.toISOString().replace('Z', '');
    }
}

export type IContractsTypesTree = {
    [commodityGroupName in CFTCCommodityGroupType]: {
        [subgroupName: string]: {
            [commodityName: string]: CommodityContractKind[];
        };
    };
};

export function makeContractsTree(src: CommodityContractKind[], identifierTransform: (identifier: string) => string = x => x): IContractsTypesTree {
    let dst: IContractsTypesTree = {
        [CFTCCommodityGroupType.Agriculture]: {},
        [CFTCCommodityGroupType.Financial]: {},
        [CFTCCommodityGroupType.NaturalResources]: {},
    };
    for (const contract of src) {
        if (contract.group == null) continue;
        if (contract.commoditySubgroupName == null) continue;
        if (contract.commodityName == null) continue;
        if (!(contract.group in dst)) {
            dst[contract.group] = {};
        }
        const commoditySubgroupName = identifierTransform(contract.commoditySubgroupName);
        const commodityName = identifierTransform(contract.commodityName);
        if (!(commoditySubgroupName in dst[contract.group!])) {
            dst[contract.group!][commoditySubgroupName] = {};
        }
        if (!(commodityName in dst[contract.group!][commoditySubgroupName])) {
            dst[contract.group!][commoditySubgroupName][commodityName] = [];
        }
        dst[contract.group!][commoditySubgroupName][commodityName].push(contract);
    }
    return dst;
}

export type AllAvailableContractTypesTree = {
    [commodityGroupName: string]: {
        [subgroupName: string]: {
            [commodityName: string]: {
                [reportType in CFTCReportType]: CommodityContractKind[];
            };
        };
    };
};

export async function fetchAllAvailableContracts(identifierTransform: (identifier: string) => string = x => x): Promise<AllAvailableContractTypesTree> {
    let dst: AllAvailableContractTypesTree = {
        [identifierTransform(CFTCCommodityGroupType.Agriculture)]: {},
        [identifierTransform(CFTCCommodityGroupType.Financial)]: {},
        [identifierTransform(CFTCCommodityGroupType.NaturalResources)]: {},
    };
    const api = new SocrataApi();
    for (const reportType of [CFTCReportType.FinancialFutures, CFTCReportType.Disaggregated, CFTCReportType.Legacy]) {
        const contracts = await api.fetchAvailableContracts({
            reportType,
        });
        for (const contract of contracts) {
            if (contract.group == null || contract.commoditySubgroupName == null || contract.commodityName == null) continue;
            const commodityGroupName = identifierTransform(contract.group);
            const commoditySubgroupName = identifierTransform(contract.commoditySubgroupName);
            const commodityName = identifierTransform(contract.commodityName);
            if (!(commodityGroupName in dst)) {
                console.error(`Unexpected commodity group: "${contract.group!}"`);
                dst[commodityGroupName] = {};
            }
            if (!(commoditySubgroupName in dst[commodityGroupName])) {
                dst[commodityGroupName][commoditySubgroupName] = {};
            }
            if (!(commodityName in dst[commodityGroupName][commoditySubgroupName])) {
                dst[commodityGroupName][commoditySubgroupName][commodityName] = {
                    [CFTCReportType.FinancialFutures]: [],
                    [CFTCReportType.Disaggregated]: [],
                    [CFTCReportType.Legacy]: [],
                };
            }
            dst[commodityGroupName][commoditySubgroupName][commodityName][reportType].push(contract);    
        }
    }
    return dst;
}
