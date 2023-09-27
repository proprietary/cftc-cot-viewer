import {
    SocrataApi,
    makeContractsTree,
    fetchAllAvailableContracts,
} from '@/lib/socrata_api'
import { CommodityContractKind } from '@/lib/CommodityContractKind'
import { CFTCCommodityGroupType, CFTCReportType } from '@/common_types'
import {
    allCapsToTitle,
    allCapsToSlug,
    slugToTitle,
} from '@/lib/cftc_api_utils'
import Link from 'next/link'
import SubgroupTree from '../subgroup_tree'
import GroupTree from '../group_tree'
import { FetchAllAvailableContracts } from '@/lib/fetchAvailableContracts'
import Breadcrumbs from '@/components/breadcrumbs'

export default async function Page({
    params,
}: {
    params: {
        commodityGroupName: string
    }
}) {
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName)
    const contractsTree = await FetchAllAvailableContracts()
    const subgroups = contractsTree.getSubgroupNames(commodityGroupNameSlug)
    return (
        <div className="flex flex-col min-h-screen mx-auto w-11/12">
            <Breadcrumbs params={params} />
            <h2 className="my-5 text-2xl antialiased">
                {slugToTitle(commodityGroupNameSlug)}
            </h2>
            <div>
                {subgroups.map((subgroupName, idx) => (
                    <div key={idx} className="py-3">
                        <Link
                            className="text-blue-500 hover:text-blue-700"
                            href={`/futures/${commodityGroupNameSlug}/${encodeURIComponent(
                                subgroupName
                            )}`}
                        >
                            {slugToTitle(subgroupName)}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    )
}

export async function generateStaticParams() {
    const cons = await FetchAllAvailableContracts()
    return cons.getGroupNames().map((commodityGroupName) => ({
        commodityGroupName,
    }))
}
