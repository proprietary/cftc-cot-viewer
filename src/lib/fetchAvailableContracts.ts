import { CFTCCommodityGroupType, CFTCContractMarketCode, CFTCReportType } from "@/common_types";
import { allCapsToSlug } from "./cftc_api_utils";
import { ContractsTree } from "./contracts_tree";
import { SocrataApi } from "./socrata_api";
import tffData from '../../public/available-contracts/financial-futures.json';
import disaggregatedData from '../../public/available-contracts/disaggregated.json';
import legacyData from '../../public/available-contracts/legacy.json';
import { CommodityContractKind } from "./CommodityContractKind";

export async function FetchAllAvailableContracts(): Promise<ContractsTree> {
    if (process.env.NODE_ENV === 'development') {
        console.info('Getting statically generated contracts during debug');
        // let tff = await (await fetch('/available-contracts/financial-futures.json')).json();
        // let disaggregated = await (await fetch('/available-contracts/disaggregated.json')).json();
        // let legacy = await (await fetch('/available-contracts/legacy.json')).json();
        return new ContractsTree(
            allCapsToSlug,
            parseAvailableContractsJSON(tffData, CFTCReportType.FinancialFutures),
            parseAvailableContractsJSON(disaggregatedData, CFTCReportType.Disaggregated),
            parseAvailableContractsJSON(legacyData, CFTCReportType.Legacy),
        );
    }
    const api = new SocrataApi();
    const [tff, disaggregated, legacy] = await Promise.all(
        [CFTCReportType.FinancialFutures, CFTCReportType.Disaggregated, CFTCReportType.Legacy]
            .map(async (reportType) => {
                const contracts = await api.fetchAvailableContracts({
                    reportType,
                });
                return contracts;
            }));
    return new ContractsTree(allCapsToSlug, tff, disaggregated, legacy);
}

function parseAvailableContractsJSON(rows: Array<Object>, reportType: CFTCReportType): CommodityContractKind[] {
    return rows.map((row: any): CommodityContractKind => {
        let dst: CommodityContractKind = {
            reportType,
            cftcContractMarketCode: row['cftc_contract_market_code'] as CFTCContractMarketCode,
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
        };
        return dst;
    });
}