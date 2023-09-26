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
                params={params}
            />

            <h3 className="text-2xl antialiased font-bold my-10">
                {slugToTitle(commodityNameSlug)}
            </h3>

            <div>
                {markets.map(({ marketAndExchangeName, contractsSet }, jdx) => (
                    <div key={jdx} className="my-5">
                        <div className="text-lg py-2 inline-flex">
                            <div className="font-medium uppercase tracking-wide pr-2">{marketAndExchangeName}</div>
                            ({Object.values(contractsSet).flat(1).at(0)?.contractMarketName})
                        </div>
                        <ul className="ml-5">
                            {contractsSet[CFTCReportType.FinancialFutures].map((contract, idx) => (
                                <li key={idx} className="list-disc">
                                    <Link
                                        key={idx}
                                        className="text-blue-500 hover:text-blue-700"
                                        href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/traders-in-financial-futures`}
                                    >
                                        Traders in Financial Futures
                                    </Link>
                                </li>
                            ))}
                            {contractsSet[CFTCReportType.Disaggregated].map((contract, idx) => (
                                <li key={idx} className="list-disc">
                                    <Link
                                        key={idx}
                                        className="text-blue-500 hover:text-blue-700"
                                        href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/disaggregated`}
                                    >
                                        Disaggregated
                                    </Link>
                                </li>
                            ))}
                            {contractsSet[CFTCReportType.Legacy].map((contract, idx) => (
                                <li key={idx} className="list-disc">
                                    <Link
                                        key={idx}
                                        className="text-blue-500 hover:text-blue-700"
                                        href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/legacy`}
                                    >
                                        Legacy
                                    </Link>
                                </li>
                            ))}
                        </ul>
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
        commodityName: encodeURIComponent(commodityName),
    }));
}
