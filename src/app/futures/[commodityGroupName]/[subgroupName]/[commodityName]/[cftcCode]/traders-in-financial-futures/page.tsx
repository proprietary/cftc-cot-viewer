import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import Tff from "./tff";
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
    const contract = contractsTree.getCommodityContract(
        commodityGroupNameSlug,
        subgroupNameSlug,
        commodityNameSlug,
        CFTCReportType.FinancialFutures,
        cftcCode,
    );
    return (
        <div className="bg-inherit">

            <nav aria-label="breadcrumbs" className="py-2">
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
                    <li>
                        Traders in Financial Futures
                    </li>
                </ol>
            </nav>

            {contract && (<Tff contract={contract} />)}
        </div>
    )
}
