import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";

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
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    const commodityGroupNameSlug = decodeURIComponent(params.commodityGroupName);
    const subgroupNameSlug = decodeURIComponent(params.subgroupName);
    const commodityNameSlug = decodeURIComponent(params.commodityName);
    const cftcCode = decodeURIComponent(params.cftcCode);
    const contractsByReportType = contractsTree[commodityGroupNameSlug][subgroupNameSlug][commodityNameSlug];
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
                        {slugToTitle(commodityNameSlug)}
                    </li>
                </ol>
            </nav>

            <div><pre>{JSON.stringify(params, null, 4)}</pre></div>
            <div>
                <div>cftc code: {cftcCode}</div>
                <pre>
                    {JSON.stringify(contractsByReportType, null, 4)}
                </pre>
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
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    const commodityGroupName = decodeURIComponent(params.commodityGroupName);
    const subgroupName = decodeURIComponent(params.subgroupName);
    const commodityName = decodeURIComponent(params.commodityName);
    console.log(contractsTree);
    console.log('commodityGrouopName, subgroupName, commodityName: %s, %s, %s', commodityGroupName, subgroupName, commodityName);
    console.log(contractsTree[commodityGroupName]);
    const byReportType = contractsTree[commodityGroupName][subgroupName][commodityName];
    for (const contract of byReportType[CFTCReportType.FinancialFutures]) {
        dst.push({
            cftcCode: contract.cftcContractMarketCode,
        });
    }
    for (const contract of byReportType[CFTCReportType.Disaggregated]) {
        dst.push({
            cftcCode: contract.cftcContractMarketCode,
        });
    }
    for (const contract of byReportType[CFTCReportType.Legacy]) {
        dst.push({
            cftcCode: contract.cftcContractMarketCode,
        });
    }
    return dst;
}
