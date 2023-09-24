'use client';

import { CommodityContractKind } from "@/lib/CommodityContractKind";
import { CFTCReportType } from "@/common_types";
import CommodityTree from "./commodity_tree";
import { slugToTitle } from "@/lib/cftc_api_utils";

export default function SubgroupTree({
    subgroupNameTitle,
    subgroupTree
}: {
    subgroupTree: {
        [commodityName: string]: {
            [reportType in CFTCReportType]: CommodityContractKind[]
        }
    },
    subgroupNameTitle: string,
}) {
    return (
        <div className="flex min-h-screen flex-col p-10">
            <pre>{/*JSON.stringify(subgroupTree, null, 4)*/}</pre>
            <h3>{subgroupNameTitle}</h3>
            {Object.entries(subgroupTree).map(([commodityName, byReportType], idx) => {
                return (
                    <CommodityTree
                        key={idx}
                        commodityNameTitle={slugToTitle(commodityName)}
                        commodityTree={byReportType}
                    />
                )
            })}
        </div>
    )
}