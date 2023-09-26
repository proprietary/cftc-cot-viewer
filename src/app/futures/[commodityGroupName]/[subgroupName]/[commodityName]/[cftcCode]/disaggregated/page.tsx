import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import Disaggregated from "./disaggregated";
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
    const cftcCode = decodeURIComponent(params.cftcCode);
    const contract = contractsTree.select({ reportType: CFTCReportType.Disaggregated, cftcContractMarketCode: cftcCode },
        ["cftcContractMarketCode"]).get("cftcContractMarketCode")?.get(cftcCode)?.at(0)?.[CFTCReportType.Disaggregated];
    return (
        <div className="min-h-screen">
            <Breadcrumbs
                params={params}
                reportType={"legacy"}
            />
            {contract && (<Disaggregated contract={contract} />)}
        </div>
    )
}
