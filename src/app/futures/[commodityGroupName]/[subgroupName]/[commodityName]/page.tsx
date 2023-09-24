import { SocrataApi, makeContractsTree, fetchAllAvailableContracts } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import CommodityTree from "@/app/futures/commodity_tree";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";
import { CommodityContractKind } from "@/lib/CommodityContractKind";

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
        <div className="flex min-h-screen flex-col p-10">
            <pre>{JSON.stringify(params, null, 4)}</pre>
            <nav aria-label="breadcrumbs" className="rounded-lg block my-2">
                <ol className="list-reset flex text-gray-700">
                    <li>
                        <Link href={`/`} className="text-blue-500 hover:text-blue-700">
                            Home
                        </Link>
                    </li>
                    <li>
                        <Link href={`/futures`} className="text-blue-500 hover:text-blue-700">
                            Futures
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={`/futures/${commodityGroupNameSlug}`}
                            className="text-blue-500 hover:text-blue-700"
                        >
                            {slugToTitle(commodityGroupNameSlug)}
                        </Link>
                    </li>
                    <li>
                        <Link
                            href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}`}
                            className="text-blue-500 hover:text-blue-700"
                        >
                            {slugToTitle(commoditySubgroupNameSlug)}
                        </Link>
                    </li>
                    <li>
                        {slugToTitle(commodityNameSlug)}
                    </li>
                </ol>
            </nav>

            <h3 className="text-2xl antialiased font-bold my-10">
                {slugToTitle(commodityNameSlug)}
            </h3>

            <div>
                {markets.map(({ marketAndExchangeName, contractsSet }, jdx) => (
                    <div key={jdx}>
                        <div className="my-2 text-lg">
                            {marketAndExchangeName}
                        </div>
                        {contractsSet[CFTCReportType.FinancialFutures].map((contract, idx) => (
                            <Link
                                key={idx}
                                href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/traders-in-financial-futures`}
                            >Traders in Financial Futures</Link>
                        ))}
                        {contractsSet[CFTCReportType.Disaggregated].map((contract, idx) => (
                            <Link
                                key={idx}
                                href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/disaggregated`}
                            >Disaggregated</Link>
                        ))}
                        {contractsSet[CFTCReportType.Legacy].map((contract, idx) => (
                            <Link
                                key={idx}
                                href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}/${commodityNameSlug}/${contract.cftcContractMarketCode}/legacy`}
                            >Legacy</Link>
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
