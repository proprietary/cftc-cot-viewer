import { SocrataApi, makeContractsTree, fetchAllAvailableContracts } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import CommodityTree from "@/app/futures/commodity_tree";

export default async function Page({
    params
}: {
    params: { commodityGroupName: string, subgroupName: string, commodityName: string, }
}) {
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const subgroupNameSlug = decodeURIComponent(params.subgroupName);
    const commodityNameSlug = decodeURIComponent(params.commodityName);
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    const commodityTree = contractsTree[commodityGroupNameSlug][subgroupNameSlug][commodityNameSlug];
    return (
        <div className="flex min-h-screen flex-col p-10">
            <pre>{JSON.stringify(params, null, 4)}</pre>
            <CommodityTree
                commodityNameTitle={slugToTitle(commodityNameSlug)}
                commodityTree={commodityTree}
            />
        </div>
    )
}


export async function generateStaticParams() {
    let dst: { commodityGroupName: string, subgroupName: string, commodityName: string }[] = [];
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    for (const [commodityGroupName, subgroupTree] of Object.entries(contractsTree)) {
        for (const [subgroupName, commoditiesTree] of Object.entries(subgroupTree)) {
            for (const [commodityName, _] of Object.entries(commoditiesTree)) {
                dst.push({
                    commodityGroupName,
                    subgroupName,
                    commodityName,
                });
            }
        }
    }
    return dst;
}
