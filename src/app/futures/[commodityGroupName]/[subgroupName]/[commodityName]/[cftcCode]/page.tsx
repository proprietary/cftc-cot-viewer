import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";
import Breadcrumbs from "@/components/breadcrumbs";
import { CCTree2, CommodityContractKindVariants } from "@/lib/contracts_tree";
import { mapToObject } from "@/mapToObject";

export default async function Page({
    params
}: {
    params: {
        commodityGroupName: string,
        subgroupName: string,
        commodityName: string,
        cftcCode: string,
    },
}) {
    const contractsTree = await FetchAllAvailableContracts();
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const subgroupNameSlug = decodeURIComponent(params.subgroupName);
    const commodityNameSlug = decodeURIComponent(params.commodityName);
    const cftcCode = decodeURIComponent(params.cftcCode);
    const [marketAndExchangeName, contractSet] = contractsTree.getContractSet(commodityGroupNameSlug, subgroupNameSlug, commodityNameSlug, cftcCode);
    return (
        <div className="flex min-h-screen flex-col mx-auto w-11/12">
            <Breadcrumbs
                params={params}
            />
            <div>
                <div>
                    <div className="my-5 text-2xl font-bold">
                        {marketAndExchangeName}
                    </div>
                    <ul className="space-y-5">
                        {contractSet && contractSet[CFTCReportType.FinancialFutures]?.length > 0 && (
                            <li className="list-disc">
                                <Link
                                    className="text-blue-500 hover:text-blue-700"
                                    href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${commodityNameSlug}/${cftcCode}/traders-in-financial-futures`}
                                >Traders in Financial Futures</Link>
                            </li>
                        )}
                        {contractSet && contractSet[CFTCReportType.Disaggregated]?.length > 0 && (
                            <li className="list-disc">
                                <Link
                                    className="text-blue-500 hover:text-blue-700"
                                    href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${commodityNameSlug}/${cftcCode}/disaggregated`}
                                >Disaggregated</Link>
                            </li>
                        )}
                        {contractSet && contractSet[CFTCReportType.Legacy]?.length > 0 && (
                            <li className="list-disc">
                                <Link
                                    className="text-blue-500 hover:text-blue-700"
                                    href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${commodityNameSlug}/${cftcCode}/legacy`}
                                >Legacy</Link>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    )
}


export async function generateStaticParams({
    params
}: {
    params: {
        commodityGroupName: string,
        subgroupName: string,
        commodityName: string,
    }
}) {
    const contractsTree = await FetchAllAvailableContracts();
    // const commodityGroupName = decodeURIComponent(params.commodityGroupName);
    // const subgroupName = decodeURIComponent(params.subgroupName);
    // const commodityName = decodeURIComponent(params.commodityName);
    // const cftcCodes = contractsTree.getCftcCodes(commodityGroupName, subgroupName, commodityName);
    let dst: {commodityGroupName: string, subgroupName: string, commodityName: string, cftcCode: string}[] = [];
    let res = contractsTree.selectTree({}, ['group', 'commoditySubgroupName', 'commodityName']);
    for (const [commodityGroupName, subtree1] of res.node.entries()) {
        for (const [subgroupName, subtree2] of subtree1.node.entries())  {
            for (const [commodityName, subtree3] of subtree2.node.entries()) {
                for (const contr of subtree3.value) {
                    const cont = Object.values(contr).at(0)!;
                    let intermediate = {
                        commodityGroupName: encodeURIComponent(allCapsToSlug(commodityGroupName)),
                        subgroupName: encodeURIComponent(allCapsToSlug(subgroupName)),
                        commodityName: encodeURIComponent(allCapsToSlug(commodityName)),
                        cftcCode: cont.cftcContractMarketCode,
                    };
                    dst.push(intermediate);
                }
            }
        }
    }
    // return cftcCodes.map((cftcCode) => ({ cftcCode }));
    return dst;
}
