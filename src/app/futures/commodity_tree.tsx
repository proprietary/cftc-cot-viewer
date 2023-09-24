import { SocrataApi, makeContractsTree } from "@/lib/socrata_api";
import { CommodityContractKind } from "@/lib/CommodityContractKind";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug } from "@/lib/cftc_api_utils";
import Link from "next/link";

export default function CommodityTree({
    commodityNameTitle,
    commodityTree,
}: {
    commodityNameTitle: string,
    commodityTree: {
        [reportType in CFTCReportType]: CommodityContractKind[]
    },
}) {
    const renderContractsLinks = (contracts: CommodityContractKind[]) =>
        contracts.map((contract, contractIdx) => (
            <div key={contractIdx} className="ml-3">
                <Link
                    className="cursor-pointer hover:text-white text-indigo-500"
                    href={`/futures/${allCapsToSlug(contract.group!)}/${allCapsToSlug(contract.commoditySubgroupName!)}/${allCapsToSlug(contract.commodityName!)}/${contract.cftcContractMarketCode}`}
                >
                    {contract.marketAndExchangeNames}
                </Link>
            </div>
        ));

    return (
        <div className="block m-2">
            <pre>{/*JSON.stringify(commodityTree, null, 4)*/}</pre>
            <div className="my-3">
                <h3 className="text-lg font-bold block">{commodityNameTitle}</h3>
                {commodityTree[CFTCReportType.FinancialFutures].length > 0 && (
                    <div>
                        <h4>Traders in Financial Futures</h4>
                        {renderContractsLinks(commodityTree[CFTCReportType.FinancialFutures])}
                    </div>
                )}
                {commodityTree[CFTCReportType.Disaggregated].length > 0 && (
                    <div>
                        <h4>Disaggregated Futures</h4>
                        {renderContractsLinks(commodityTree[CFTCReportType.Disaggregated])}
                    </div>
                )}

                {commodityTree[CFTCReportType.Legacy].length > 0 && (
                    <div>
                        <h4>Legacy COT Reports</h4>
                        {renderContractsLinks(commodityTree[CFTCReportType.Legacy])}
                    </div>
                )}
            </div>
        </div>
    )
}


export async function generateStaticParams() {
    const contracts = await (new SocrataApi()).fetchAvailableContracts({
        reportType: CFTCReportType.FinancialFutures
    });
    const contractsTree = makeContractsTree(contracts, allCapsToSlug);
    let dst: { subgroupName: string }[] = [];
    for (const [subgroupName, v] of Object.entries(contractsTree[CFTCCommodityGroupType.Financial])) {
        dst.push({
            subgroupName,
        });
    }
    return dst;
}
