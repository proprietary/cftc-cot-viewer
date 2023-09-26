import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToSlug, slugToTitle, slugToAllCaps } from "@/lib/cftc_api_utils";
import SubgroupTree from "@/app/futures/subgroup_tree";
import Link from "next/link";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";
import { CommodityContractKind } from "@/lib/CommodityContractKind";
import Breadcrumbs from "@/components/breadcrumbs";

export default async function Page({
    params
}: {
    params: { commodityGroupName: string, subgroupName: string, },
}) {
    const contractsTree = await FetchAllAvailableContracts();
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const subgroupNameSlug = decodeURIComponent(params.subgroupName);
    const commodities = contractsTree.getCommodityNames(commodityGroupNameSlug, subgroupNameSlug);
    const commodContracts = contractsTree.getCommods(commodityGroupNameSlug, subgroupNameSlug)
        .reduce((acc, val) => {
            const n = allCapsToSlug(val.commodityName);
            if (!acc.has(n)) acc.set(n, val);
            return acc;
        }, new Map<string, CommodityContractKind>());
    let c = contractsTree.select(
        {
            commoditySubgroupName: subgroupNameSlug,
            group: commodityGroupNameSlug,
        },
        [
            "commodityName",
        ],
    )
    const MapToJson = (m: any) => {
        const output: any = {};
        m.forEach((value: any, key: any) => {
            if (value instanceof Map) {
                output[key] = MapToJson(value);
            } else {
                output[key] = value;
            }
        });
        return output;
    }
    let commodContracts2 = Array.from(c.get("commodityName")!.entries()!)
        .sort(
            ([_1, a], [_2, b]) => {
                const oldestA = Math.min(...a.flatMap(x => Object.values(x)).map(x => x ? Date.parse(x.oldestReportDate) : Infinity));
                const oldestB = Math.min(...b.flatMap(x => Object.values(x)).map(x => x ? Date.parse(x.oldestReportDate) : Infinity));
                return oldestA - oldestB;
            }
        );
    return (
        <div className="flex min-h-screen flex-col mx-auto w-11/12">
            <Breadcrumbs
                commodityGroupNameSlug={commodityGroupNameSlug}
                subgroupNameSlug={subgroupNameSlug}
            />
            {commodContracts2.map(([commodityName, contracts], idx) => (
                <div key={idx} className="my-4">
                    <Link
                        href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${allCapsToSlug(commodityName as string)}`}
                    >
                        <span className="font-bold text-lg">{commodityName}</span>
                    </Link>
                    <div className="my-2 ml-3 flex flex-col gap-3">
                        {contracts.map((contract, jdx) => (
                            <div key={jdx}>
                                <div>
                                    <span className="font-semibold">
                                        {Object.values(contract).filter(x => x != null).at(0)?.contractMarketName}
                                    </span>
                                    <span className="text-sm ml-3">
                                        {Object.values(contract).filter(x => x != null).at(0)?.marketAndExchangeNames}
                                    </span>
                                </div>
                                {contract[CFTCReportType.FinancialFutures] != null && (
                                    <Link
                                        className="px-2 text-blue-700 hover:text-blue-500"
                                        href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${allCapsToSlug(commodityName as string)}/${contract[CFTCReportType.FinancialFutures].cftcContractMarketCode}/traders-in-financial-futures`}
                                    >
                                        Traders in Financial Futures
                                    </Link>
                                )}
                                {contract[CFTCReportType.Disaggregated] != null && (
                                    <Link
                                        className="px-2 text-blue-700 hover:text-blue-500"
                                        href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${allCapsToSlug(commodityName as string)}/${contract[CFTCReportType.Disaggregated].cftcContractMarketCode}/disaggregated`}
                                    >
                                        Disaggregated
                                    </Link>
                                )}
                                {contract[CFTCReportType.Legacy] != null && (
                                    <Link
                                        className="px-2 text-blue-700 hover:text-blue-500"
                                        href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${allCapsToSlug(commodityName as string)}/${contract[CFTCReportType.Legacy].cftcContractMarketCode}/legacy`}
                                    >
                                        Legacy
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div>
                <pre>{JSON.stringify(MapToJson(c), null, 4)}</pre>
            </div>
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
