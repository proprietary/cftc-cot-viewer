import { allCapsToSlug } from '@/lib/cftc_api_utils'
import Link from 'next/link'
import { FetchAllAvailableContracts } from '@/lib/fetchAvailableContracts'
import Breadcrumbs from '@/components/breadcrumbs'
import { CFTCReportType } from '@/common_types'
import { CCTree2 } from '@/lib/contracts_tree'
import { mapToObject } from '@/mapToObject'

export default async function Page({
    params,
}: {
    params: { commodityGroupName: string; subgroupName: string }
}) {
    const contractsTree = await FetchAllAvailableContracts()
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName)
    const subgroupNameSlug = decodeURIComponent(params.subgroupName)
    let c = Array.from(
        contractsTree
            .select(
                {
                    commoditySubgroupName: subgroupNameSlug,
                    group: commodityGroupNameSlug,
                },
                ['commodityName']
            )
            .get('commodityName')!
            .entries()
    )

    let dst: { commodityGroupName: string; subgroupName: string }[] = []
    for (const [commodityGroupName, subtree] of contractsTree
        .selectTree({}, ['group', 'commoditySubgroupName'])
        .node.entries()) {
        for (const subgroupName of subtree.node.keys()) {
            dst.push({
                commodityGroupName: encodeURIComponent(
                    allCapsToSlug(commodityGroupName)
                ),
                subgroupName: encodeURIComponent(allCapsToSlug(subgroupName)),
            })
        }
    }
    return (
        <div className="flex min-h-screen flex-col mx-auto w-11/12">
            <Breadcrumbs params={params} />
            {c.map(([commodityName, contracts], idx) => (
                <div key={idx} className="my-4">
                    <Link
                        className="font-bold text-2xl my-10"
                        href={`/futures/${params.commodityGroupName}/${
                            params.subgroupName
                        }/${encodeURIComponent(
                            allCapsToSlug(commodityName as string)
                        )}`}
                    >
                        {commodityName}
                    </Link>
                    <div className="my-2 ml-3 flex flex-col gap-3">
                        {contracts
                            .sort(
                                (a, b) =>
                                    Math.min(
                                        ...Object.values(a).map((x) =>
                                            x
                                                ? Date.parse(x.oldestReportDate)
                                                : Infinity
                                        )
                                    ) -
                                    Math.min(
                                        ...Object.values(b).map((x) =>
                                            x
                                                ? Date.parse(x.oldestReportDate)
                                                : Infinity
                                        )
                                    )
                            )
                            .map((contract, jdx) => (
                                <div key={jdx}>
                                    <div>
                                        <span className="font-semibold">
                                            {
                                                Object.values(contract)
                                                    .filter((x) => x != null)
                                                    .at(0)?.contractMarketName
                                            }
                                        </span>
                                        <span className="text-sm ml-3">
                                            {
                                                Object.values(contract)
                                                    .filter((x) => x != null)
                                                    .at(0)
                                                    ?.marketAndExchangeNames
                                            }
                                        </span>
                                    </div>
                                    {contract[
                                        CFTCReportType.FinancialFutures
                                    ] != null && (
                                        <Link
                                            className="px-2 text-blue-700 hover:text-blue-500"
                                            href={`/futures/${
                                                params.commodityGroupName
                                            }/${
                                                params.subgroupName
                                            }/${encodeURIComponent(
                                                allCapsToSlug(
                                                    contract[
                                                        CFTCReportType
                                                            .FinancialFutures
                                                    ].commodityName
                                                )
                                            )}/${
                                                contract[
                                                    CFTCReportType
                                                        .FinancialFutures
                                                ].cftcContractMarketCode
                                            }/traders-in-financial-futures`}
                                        >
                                            Traders in Financial Futures
                                        </Link>
                                    )}
                                    {contract[CFTCReportType.Disaggregated] !=
                                        null && (
                                        <Link
                                            className="px-2 text-blue-700 hover:text-blue-500"
                                            href={`/futures/${
                                                params.commodityGroupName
                                            }/${
                                                params.subgroupName
                                            }/${encodeURIComponent(
                                                allCapsToSlug(
                                                    contract[
                                                        CFTCReportType
                                                            .Disaggregated
                                                    ].commodityName
                                                )
                                            )}/${
                                                contract[
                                                    CFTCReportType.Disaggregated
                                                ].cftcContractMarketCode
                                            }/disaggregated`}
                                        >
                                            Disaggregated
                                        </Link>
                                    )}
                                    {contract[CFTCReportType.Legacy] !=
                                        null && (
                                        <Link
                                            className="px-2 text-blue-700 hover:text-blue-500"
                                            href={`/futures/${
                                                params.commodityGroupName
                                            }/${
                                                params.subgroupName
                                            }/${encodeURIComponent(
                                                allCapsToSlug(
                                                    contract[
                                                        CFTCReportType.Legacy
                                                    ].commodityName
                                                )
                                            )}/${
                                                contract[CFTCReportType.Legacy]
                                                    .cftcContractMarketCode
                                            }/legacy`}
                                        >
                                            Legacy
                                        </Link>
                                    )}
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

export async function generateStaticParams({
    params,
}: {
    params: { commodityGroupName: string }
}) {
    const contractsTree = await FetchAllAvailableContracts()
    let dst: { commodityGroupName: string; subgroupName: string }[] = []
    for (const [commodityGroupName, subtree] of contractsTree
        .selectTree({}, ['group', 'commoditySubgroupName'])
        .node.entries()) {
        for (const subgroupName of subtree.node.keys()) {
            dst.push({
                commodityGroupName: allCapsToSlug(commodityGroupName),
                subgroupName: allCapsToSlug(subgroupName),
            })
        }
    }
    return dst
    // return contractsTree.getGroupNames().flatMap((groupName) => contractsTree.getSubgroupNames(groupName).map(subgroupName => ({
    //     subgroupName: encodeURIComponent(subgroupName),
    //     commodityGroupName: encodeURIComponent(groupName),
    // })));
}
