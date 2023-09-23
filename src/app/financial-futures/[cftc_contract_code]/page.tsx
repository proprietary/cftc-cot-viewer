import { CFTCReportType } from "@/common_types";
import { SocrataApi } from "@/socrata_api";
import Tff from './tff';

export default async function Page({
    params
}: {
    params: { cftc_contract_code: string },
}) {
    const contracts = await (new SocrataApi()).fetchAvailableContracts({reportType: CFTCReportType.FinancialFutures});
    const thisCon = contracts.find(x => x.cftcContractMarketCode === params.cftc_contract_code);
    return (
        <div className="my-2">
            <h2>TFF</h2>
            <div>
                {params.cftc_contract_code}
            </div>
            <div>
                {thisCon && (
                    <Tff cftcCode={params.cftc_contract_code} contract={thisCon} />
                )}
            </div>
        </div>
    )
}

export async function generateStaticParams() {
    const api = new SocrataApi();
    const contracts = await api.fetchAvailableContracts({reportType: CFTCReportType.FinancialFutures});
    return contracts.map((con) => {
        return {
            cftc_contract_code: con.cftcContractMarketCode,
        };
    });
}
