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
    const commoditySubgroupNameSlug = decodeURIComponent(params.subgroupName);
    const commodityNameSlug = decodeURIComponent(params.commodityName);
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    const commodityTree = contractsTree[commodityGroupNameSlug][commoditySubgroupNameSlug][commodityNameSlug];
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

            <CommodityTree
                commodityNameTitle={slugToTitle(commodityNameSlug)}
                commodityTree={commodityTree}
                depth={5}
                commodityGroupNameSlug={commodityGroupNameSlug}
                commodityNameSlug={commodityNameSlug}
                commoditySubgroupNameSlug={commoditySubgroupNameSlug}
            />
        </div>
    )
}


export async function generateStaticParams({
    params
}: {
    params: { commodityGroupName: string, subgroupName: string },
}) {
    let dst: { commodityName: string }[] = [];
    if (params.commodityGroupName == null || params.subgroupName == null) return dst;
    const commodityGroupName = decodeURIComponent(params.commodityGroupName);
    const subgroupName = decodeURIComponent(params.subgroupName);
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    for (const [commodityName, _] of Object.entries(contractsTree[commodityGroupName][subgroupName])) {
        dst.push({
            commodityName,
        });
    }
    return dst;
}
