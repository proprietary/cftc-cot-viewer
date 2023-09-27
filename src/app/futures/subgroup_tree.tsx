'use client'

import { CommodityContractKind } from '@/lib/CommodityContractKind'
import { CFTCReportType } from '@/common_types'
import CommodityTree from './commodity_tree'
import { slugToTitle } from '@/lib/cftc_api_utils'
import Link from 'next/link'

export default function SubgroupTree({
    commoditySubgroupNameTitle,
    subgroupTree,
    depth,
    commoditySubgroupNameSlug,
    commodityGroupNameSlug,
}: {
    subgroupTree: {
        [commodityName: string]: {
            [reportType in CFTCReportType]: CommodityContractKind[]
        }
    }
    depth: number
    commoditySubgroupNameTitle: string
    commoditySubgroupNameSlug: string
    commodityGroupNameSlug: string
}) {
    return (
        <div className="flex flex-col my-2">
            <pre>{/*JSON.stringify(subgroupTree, null, 4)*/}</pre>
            <h3 className="text-lg block">
                <Link
                    href={`/futures/${commodityGroupNameSlug}/${commoditySubgroupNameSlug}`}
                >
                    {commoditySubgroupNameTitle}
                </Link>
            </h3>
            {subgroupTree &&
                depth > 0 &&
                Object.entries(subgroupTree).map(
                    ([commodityName, byReportType], idx) => {
                        return (
                            <CommodityTree
                                key={idx}
                                commodityNameTitle={slugToTitle(commodityName)}
                                commodityTree={byReportType}
                                commodityNameSlug={commodityName}
                                commodityGroupNameSlug={commodityGroupNameSlug}
                                commoditySubgroupNameSlug={
                                    commoditySubgroupNameSlug
                                }
                                depth={depth - 1}
                            />
                        )
                    }
                )}
        </div>
    )
}
