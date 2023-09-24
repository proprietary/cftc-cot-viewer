import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToSlug, slugToTitle, slugToAllCaps } from "@/lib/cftc_api_utils";
import SubgroupTree from "@/app/futures/subgroup_tree";

export default async function Page({
    params
}: {
    params: { commodityGroupName: string, subgroupName: string, },
}) {
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    const commodityGroupName = decodeURIComponent(params.commodityGroupName);
    const subgroupName = decodeURIComponent(params.subgroupName);
    const thisSubgroup = contractsTree[commodityGroupName][subgroupName];
    return (
        <div className="flex min-h-screen flex-col p-10">
            <pre>{JSON.stringify(params, null, 4)}</pre>
            <SubgroupTree
                subgroupTree={thisSubgroup}
                subgroupNameTitle={slugToTitle(subgroupName)}
            />
        </div>
    )
}


export async function generateStaticParams() {
    let dst: {commodityGroupName: string, subgroupName: string}[] = [];
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    for (const [commodityGroupName, subgroupTree] of Object.entries(contractsTree)) {
        for (const [subgroupName, _] of Object.entries(subgroupTree)) {
            dst.push({
                commodityGroupName,
                subgroupName,
            });
        }
    }
    return dst;
}
