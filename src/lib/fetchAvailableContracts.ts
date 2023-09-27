import { CFTCReportType } from "@/common_types";
import { allCapsToSlug } from "./cftc_api_utils";
import { ContractsTree } from "./contracts_tree";
import { SocrataApi } from "./socrata_api";
import { parseAvailableContractsJSON } from "./parseAvailableContractsJSON";

export async function FetchAllAvailableContracts(): Promise<ContractsTree> {
    if (true || process.env.NODE_ENV === 'development') {
        // let tff = await (await fetch('/available-contracts/financial-futures.json')).json();
        // let disaggregated = await (await fetch('/available-contracts/disaggregated.json')).json();
        // let legacy = await (await fetch('/available-contracts/legacy.json')).json();
        //import tffData from '../../public/available-contracts/financial-futures.json';
        // import disaggregatedData from '../../public/available-contracts/disaggregated.json';
        // import legacyData from '../../public/available-contracts/legacy.json';

        return new ContractsTree(
            allCapsToSlug,
            parseAvailableContractsJSON(require('../../public/available-contracts/financial-futures.json'), CFTCReportType.FinancialFutures),
            parseAvailableContractsJSON(require('../../public/available-contracts/disaggregated.json'), CFTCReportType.Disaggregated),
            parseAvailableContractsJSON(require('../../public/available-contracts/legacy.json'), CFTCReportType.Legacy),
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

