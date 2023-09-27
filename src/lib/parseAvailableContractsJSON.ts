import {
    CFTCCommodityGroupType,
    CFTCContractMarketCode,
    CFTCReportType,
} from '@/common_types'
import { CommodityContractKind } from './CommodityContractKind'

export function parseAvailableContractsJSON(
    rows: Array<Object>,
    reportType: CFTCReportType
): CommodityContractKind[] {
    return rows.map((row: any): CommodityContractKind => {
        let dst: CommodityContractKind = {
            reportType,
            cftcContractMarketCode: row[
                'cftc_contract_market_code'
            ] as CFTCContractMarketCode,
            marketAndExchangeNames: row['market_and_exchange_names'],
            commodityName: row['commodity_name'],
            cftcMarketCode: row['cftc_market_code'],
            cftcRegionCode: row['cftc_region_code'],
            contractMarketName: row['contract_market_name'],
            commodity: row['commodity'],
            cftcCommodityCode: row['cftc_commodity_code'].trim(),
            cftcSubgroupCode: undefined,
            commoditySubgroupName: row['commodity_subgroup_name'],
            group: row['commodity_group_name'] as CFTCCommodityGroupType,
            oldestReportDate: row['oldest_report_date'],
        }
        return dst
    })
}
