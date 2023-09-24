'use client';

import { CommodityContractKind } from "@/lib/CommodityContractKind";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import SubgroupTree from "./subgroup_tree";
import Link from "next/link";

export default function GroupTree({
    commodityGroupNameTitle,
    commodityGroupNameSlug,
    commodityGroupTree,
    depth,
}: {
    commodityGroupNameSlug: string,
    commodityGroupNameTitle: string,
    commodityGroupTree: {
        [subgroupName: string]: {
            [commodityName: string]: {
                [reportType in CFTCReportType]: CommodityContractKind[];
            };
        };
    },
    depth: number,
}) {
    return (
        <div>
            <pre>{/*JSON.stringify(params, null, 4)*/}</pre>

            <div className="block">
                <h3 className="text-lg font-bold">
                    <Link href={`/futures/${commodityGroupNameSlug}`}>
                        {commodityGroupNameTitle}
                    </Link>
                </h3>
            </div>

            {commodityGroupTree && depth > 0 && Object.entries(commodityGroupTree).map(([subgroupName, subgroupTree], idx) => {
                return (
                    <SubgroupTree
                        key={idx}
                        commoditySubgroupNameTitle={slugToTitle(subgroupName)}
                        commoditySubgroupNameSlug={subgroupName}
                        subgroupTree={subgroupTree}
                        depth={depth - 1}
                        commodityGroupNameSlug={commodityGroupNameSlug}
                    />
                )
            })}
        </div>
    );
}