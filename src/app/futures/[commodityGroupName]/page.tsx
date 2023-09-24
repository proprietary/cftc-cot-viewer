import { SocrataApi, makeContractsTree, fetchAllAvailableContracts } from "@/lib/socrata_api";
import { CommodityContractKind } from "@/lib/CommodityContractKind";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import SubgroupTree from "../subgroup_tree";
import GroupTree from "../group_tree";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";

export default async function Page({
    params
}: {
    params: {
        commodityGroupName: string,
    }
}) {
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const contractsTree = await FetchAllAvailableContracts();
    const subgroups = contractsTree.getSubgroupNames(commodityGroupNameSlug);
    return (
        <div>
            <nav aria-label="breadcrumbs" className="rounded-lg block my-2 p-4">
                <ol className="list-reset flex text-gray-700">
                    <li className="flex items-center">
                        <Link href={`/`} className="text-blue-500 hover:text-blue-700">
                            Home
                        </Link>
                    </li>
                    <li className="flex items-center">
                        <Link href={`/futures`} className="text-blue-500 hover:text-blue-700">
                            Futures
                        </Link>
                    </li>
                    <li className="flex items-center">
                        {slugToTitle(commodityGroupNameSlug)}
                    </li>
                </ol>
            </nav>

            <h2 className="block my-2">{slugToTitle(commodityGroupNameSlug)}</h2>

            <pre>{JSON.stringify(params, null, 4)}</pre>
            <div>
                {subgroups.map((subgroupName, idx) => (
                    <div key={idx}>
                        <Link href={`/futures/${commodityGroupNameSlug}/${subgroupName}`}>
                            {slugToTitle(subgroupName)}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}


export async function generateStaticParams() {
    const cons = await FetchAllAvailableContracts();
    return cons.getGroupNames().map(commodityGroupName => ({
        commodityGroupName,
    }));
}
