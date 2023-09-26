import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Link from "next/link";
import Legacy from "./legacy";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";
import Breadcrumbs from "@/components/breadcrumbs";

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
    const contract = contractsTree.select({ reportType: CFTCReportType.Legacy, cftcContractMarketCode: cftcCode },
        ["cftcContractMarketCode"]).get("cftcContractMarketCode")?.get(cftcCode)?.at(0)?.[CFTCReportType.Legacy];
    return (
        <div className="min-h-screen">
            <Breadcrumbs
                params={params}
                reportType={"legacy"}
            />
            {contract && (<Legacy contract={contract} />)}
        </div>
    )
}
