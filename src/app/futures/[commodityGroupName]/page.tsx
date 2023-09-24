import { SocrataApi, makeContractsTree, fetchAllAvailableContracts } from "@/lib/socrata_api";
import { CommodityContractKind } from "@/lib/CommodityContractKind";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import SubgroupTree from "../subgroup_tree";
import GroupTree from "../group_tree";

export default async function Page({
    params
}: {
    params: {
        commodityGroupName: string,
    }
}) {
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    const subgroups = contractsTree[commodityGroupNameSlug];
    return (
        <div>
            <pre>JSON.stringify(params, null, 4)</pre>
            <GroupTree
                commodityGroupNameTitle={slugToTitle(commodityGroupNameSlug)}
                commodityGroupTree={subgroups}
            />
        </div>
    );
}


export async function generateStaticParams() {
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    return Object.keys(contractsTree).map((commodityGroupName) => ({
        commodityGroupName,
    }));
}
