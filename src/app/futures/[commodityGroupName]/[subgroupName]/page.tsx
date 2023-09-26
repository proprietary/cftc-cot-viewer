import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToSlug, slugToTitle, slugToAllCaps } from "@/lib/cftc_api_utils";
import SubgroupTree from "@/app/futures/subgroup_tree";
import Link from "next/link";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";
import { CommodityContractKind } from "@/lib/CommodityContractKind";
import Breadcrumbs from "@/components/breadcrumbs";

export default async function Page({
    params
}: {
    params: { commodityGroupName: string, subgroupName: string, },
}) {
    const contractsTree = await FetchAllAvailableContracts();
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const subgroupNameSlug = decodeURIComponent(params.subgroupName);
    let c = Array.from(contractsTree.select(
        {
            commoditySubgroupName: subgroupNameSlug,
            group: commodityGroupNameSlug,
        },
        [
            "commodityName",
        ],
    ).get("commodityName")!.entries());
    return (
        <div className="flex min-h-screen flex-col mx-auto w-11/12">
            <Breadcrumbs
                params={params}
            />
            {c.map(([commodityName, contracts], idx) => (
                <div key={idx} className="my-4">
                    <Link
                        className="font-bold text-2xl my-10"
                        href={`/futures/${params.commodityGroupName}/${params.subgroupName}/${encodeURIComponent(allCapsToSlug(commodityName as string))}`}
                    >
                        {commodityName}
                    </Link>
                    <div className="my-2 ml-3 flex flex-col gap-3">
                        {contracts.sort((a, b) => Math.min(...Object.values(a).map(x => x ? Date.parse(x.oldestReportDate) : Infinity)) - Math.min(...Object.values(b).map(x => x ? Date.parse(x.oldestReportDate) : Infinity)))
                            .map((contract, jdx) => (
                                <div key={jdx}>
                                    <div>
                                        <span className="font-semibold">
                                            {Object.values(contract).filter(x => x != null).at(0)?.contractMarketName}
                                        </span>
                                        <span className="text-sm ml-3">
                                            {Object.values(contract).filter(x => x != null).at(0)?.marketAndExchangeNames}
                                        </span>
                                    </div>
                                    {contract[CFTCReportType.FinancialFutures] != null && (
                                        <Link
                                            className="px-2 text-blue-700 hover:text-blue-500"
                                            href={`/futures/${params.commodityGroupName}/${params.subgroupName}/${encodeURIComponent(allCapsToSlug(contract[CFTCReportType.FinancialFutures].commodityName))}/${contract[CFTCReportType.FinancialFutures].cftcContractMarketCode}/traders-in-financial-futures`}
                                        >
                                            Traders in Financial Futures
                                        </Link>
                                    )}
                                    {contract[CFTCReportType.Disaggregated] != null && (
                                        <Link
                                            className="px-2 text-blue-700 hover:text-blue-500"
                                            href={`/futures/${params.commodityGroupName}/${params.subgroupName}/${encodeURIComponent(allCapsToSlug(contract[CFTCReportType.Disaggregated].commodityName))}/${contract[CFTCReportType.Disaggregated].cftcContractMarketCode}/disaggregated`}
                                        >
                                            Disaggregated
                                        </Link>
                                    )}
                                    {contract[CFTCReportType.Legacy] != null && (
                                        <Link
                                            className="px-2 text-blue-700 hover:text-blue-500"
                                            href={`/futures/${params.commodityGroupName}/${params.subgroupName}/${encodeURIComponent(allCapsToSlug(contract[CFTCReportType.Legacy].commodityName))}/${contract[CFTCReportType.Legacy].cftcContractMarketCode}/legacy`}
                                        >
                                            Legacy
                                        </Link>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    )
}


export async function generateStaticParams({
    params
}: {
    params: { commodityGroupName: string },
}) {
    const contractsTree = await FetchAllAvailableContracts();
    return contractsTree.getSubgroupNames(params.commodityGroupName).map((subgroupName) => ({
        subgroupName: encodeURIComponent(subgroupName),
    }))
}
