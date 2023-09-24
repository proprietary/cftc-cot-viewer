'use client';

import { CommodityContractKind } from "@/lib/CommodityContractKind";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import SubgroupTree from "./subgroup_tree";

export default function GroupTree({
    commodityGroupNameTitle,
    commodityGroupTree,
}: {
    commodityGroupNameTitle: string,
    commodityGroupTree: {
        [subgroupName: string]: {
            [commodityName: string]: {
                [reportType in CFTCReportType]: CommodityContractKind[];
            };
        };
    },
}) {
    return (
        <div>
            <pre>{/*JSON.stringify(params, null, 4)*/}</pre>
            <div className="block">
                <h3 className="text-lg font-bold">{commodityGroupNameTitle}</h3>
            </div>
            {commodityGroupTree && Object.entries(commodityGroupTree).map(([subgroupName, subgroupTree], idx) => {
                return (
                    <SubgroupTree
                        key={idx}
                        subgroupNameTitle={slugToTitle(subgroupName)}
                        subgroupTree={subgroupTree}
                    />
                )
            })}
        </div>
    );
}