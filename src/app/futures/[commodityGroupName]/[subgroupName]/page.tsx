import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToSlug, slugToTitle, slugToAllCaps } from "@/lib/cftc_api_utils";
import SubgroupTree from "@/app/futures/subgroup_tree";
import Link from "next/link";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";

export default async function Page({
    params
}: {
    params: { commodityGroupName: string, subgroupName: string, },
}) {
    const contractsTree = await FetchAllAvailableContracts();
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const subgroupNameSlug = decodeURIComponent(params.subgroupName);
    const commodities = contractsTree.getCommodityNames(commodityGroupNameSlug, subgroupNameSlug);
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
                        {slugToTitle(subgroupNameSlug)}
                    </li>
                </ol>
            </nav>
            {commodities.map((commodityName, idx) => (
                <div key={idx}>
                    <Link
                        href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${commodityName}`}
                    >
                        {slugToTitle(commodityName)}
                    </Link>
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
        subgroupName,
    }))
}
