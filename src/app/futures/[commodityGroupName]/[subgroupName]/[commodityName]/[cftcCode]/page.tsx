import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";

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
    const [ marketAndExchangeName, contractSet ] = contractsTree.getContractSet(commodityGroupNameSlug, subgroupNameSlug, commodityNameSlug, cftcCode);
    return (
        <div className="flex min-h-screen flex-col p-10">

            <nav aria-label="breadcrumbs" className="rounded-lg block my-2 p-4">
                <ol className="list-reset flex text-gray-700">
                    <li className="flex items-center">
                        <Link href={`/`} className="text-blue-500 hover:text-blue-700">
                            Home
                        </Link>
                    </li>
                    <li className="flex items-center">
                        <Link href={`/futures`} className="text-blue-500 hover:text-blue-700">
                            Futures
                        </Link>
                    </li>
                    <li className="flex items-center">
                        <Link href={`/futures/${commodityGroupNameSlug}`} className="text-blue-500 hover:text-blue-700">
                            {slugToTitle(commodityGroupNameSlug)}
                        </Link>
                    </li>
                    <li className="flex items-center">
                        <Link href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}`}
                            className="text-blue-500 hover:text-blue-700">
                            {slugToTitle(subgroupNameSlug)}
                        </Link>
                    </li>
                    <li className="flex items-center">
                        <Link href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${commodityNameSlug}`}
                            className="text-blue-500 hover:text-blue-700">
                            {slugToTitle(commodityNameSlug)}
                        </Link>
                    </li>
                    <li className="flex items-center">
                        {cftcCode}
                    </li>
                </ol>
            </nav>

            <div>
                <div>
                    <div className="my-2 text-lg">
                        {marketAndExchangeName}
                    </div>
                    {contractSet && contractSet[CFTCReportType.FinancialFutures]?.length > 0 && (
                        <Link
                            href={`/futures/${commodityGroupNameSlug}/${subgroupNameSlug}/${commodityNameSlug}/${cftcCode}/traders-in-financial-futures`}
                        >Traders in Financial Futures</Link>
                    )}
                    {contractSet && contractSet[CFTCReportType.Disaggregated]?.length > 0 && (
                        <Link
                            href={`/futures/${commodityGroupNameSlug}/${commodityNameSlug}/${commodityNameSlug}/${cftcCode}/disaggregated`}
                        >Disaggregated</Link>
                    )}
                    {contractSet && contractSet[CFTCReportType.Legacy]?.length > 0 && (
                        <Link
                            href={`/futures/${commodityGroupNameSlug}/${commodityNameSlug}/${commodityNameSlug}/${cftcCode}/legacy`}
                        >Legacy</Link>
                    )}
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
    let dst: { cftcCode: string }[] = [];
    if (params.commodityGroupName == null || params.subgroupName == null || params.commodityName == null) return dst;
    const contractsTree = await FetchAllAvailableContracts();
    const commodityGroupName = decodeURIComponent(params.commodityGroupName);
    const subgroupName = decodeURIComponent(params.subgroupName);
    const commodityName = decodeURIComponent(params.commodityName);
    const cftcCodes = contractsTree.getCftcCodes(commodityGroupName, subgroupName, commodityName);
    return cftcCodes.map((cftcCode) => ({ cftcCode }));
}
