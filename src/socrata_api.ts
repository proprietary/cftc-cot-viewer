import { IAnyCOTReportType } from "./socrata_cot_report";
import { DateRangeRequest, ContractListRequest } from "./cftc_api";
import { CFTCContractMarketCode, CFTCReportType, CFTCCommodityGroupType } from "./common_types";


export interface CommodityContractKind {
    // This must be distinct.
    cftcContractMarketCode: CFTCContractMarketCode;

    reportType: CFTCReportType;

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

    // corresponds to column `commodity` in the API result--no idea if it's different from `commodityName`
    commodity?: string;
}

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
        const selectColumns = [
            'cftc_contract_market_code',
            'market_and_exchange_names',
            'contract_market_name',
            'commodity_name',
            'cftc_market_code',
            'cftc_region_code',
            'cftc_subgroup_code',
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
                break;
            // Traders in Financial Futures
            case CFTCReportType.FinancialFutures:
                baseUrl = "https://publicreporting.cftc.gov/resource/gpe5-46if.json";
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
                cftcSubgroupCode: row['cftc_subgroup_code'],
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
