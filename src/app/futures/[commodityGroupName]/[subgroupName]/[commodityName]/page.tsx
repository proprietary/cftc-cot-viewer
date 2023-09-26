import { SocrataApi, makeContractsTree, fetchAllAvailableContracts } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import CommodityTree from "@/app/futures/commodity_tree";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";
import { CommodityContractKind } from "@/lib/CommodityContractKind";
import Breadcrumbs from "@/components/breadcrumbs";

export default async function Page({
    params
}: {
    params: { commodityGroupName: string, subgroupName: string, commodityName: string, }
}) {
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const commoditySubgroupNameSlug = decodeURIComponent(params.subgroupName);
    const commodityNameSlug = decodeURIComponent(params.commodityName);
    const contractsTree = await FetchAllAvailableContracts();
    const markets = contractsTree.getCommodityContracts(
        commodityGroupNameSlug,
        commoditySubgroupNameSlug,
        commodityNameSlug,
    );
    return (
        <div className="flex flex-col min-h-screen w-11/12 mx-auto">
            <Breadcrumbs
                commodityGroupNameSlug={commodityGroupNameSlug}
                subgroupNameSlug={commoditySubgroupNameSlug}
                commodityNameSlug={commodityNameSlug}
            />

            <h3 className="text-2xl antialiased font-bold my-10">
                {slugToTitle(commodityNameSlug)}
            </h3>

            <div>
                {markets.map(({ marketAndExchangeName, contractsSet }, jdx) => (
                    <div key={jdx}>
                        <div className="my-2 text-lg">
                            {marketAndExchangeName} ({Object.values(contractsSet).flat(1).at(0)?.contractMarketName})
                        </div>
                        {contractsSet[CFTCReportType.FinancialFutures].map((contract, idx) => (
                            <Link
                                key={idx}
                                href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/traders-in-financial-futures`}
                            >
                                Traders in Financial Futures
                            </Link>
                        ))}
                        {contractsSet[CFTCReportType.Disaggregated].map((contract, idx) => (
                            <Link
                                key={idx}
                                href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/disaggregated`}
                            >
                                Disaggregated
                            </Link>
                        ))}
                        {contractsSet[CFTCReportType.Legacy].map((contract, idx) => (
                            <Link
                                key={idx}
                                href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/legacy`}
                            >
                                Legacy
                            </Link>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}


export async function generateStaticParams({
    params
}: {
    params: { commodityGroupName: string, subgroupName: string },
}) {
    if (params.commodityGroupName == null || params.subgroupName == null) return [];
    const commodityGroupName = decodeURIComponent(params.commodityGroupName);
    const subgroupName = decodeURIComponent(params.subgroupName);
    const contractsTree = await FetchAllAvailableContracts();
    return contractsTree.getCommodityNames(commodityGroupName, subgroupName).map((commodityName) => ({
        commodityName,
    }));
}
