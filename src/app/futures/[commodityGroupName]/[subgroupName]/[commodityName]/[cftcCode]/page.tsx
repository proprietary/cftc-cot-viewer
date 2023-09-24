import { SocrataApi, fetchAllAvailableContracts, makeContractsTree } from "@/lib/socrata_api";
import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug } from "@/lib/cftc_api_utils";
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
            <div><pre>{JSON.stringify(params, null, 4)}</pre></div>
            <div>
                <div>cftc code: {cftcCode}</div>
                <pre>
                    {/*JSON.stringify(contractsByReportType, null, 4)*/}
                </pre>
            </div>
        </div>
    )
}


export async function generateStaticParams() {
    let dst: { commodityGroupName: string, subgroupName: string, commodityName: string, cftcCode: string }[] = [];
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    for (const [commodityGroupName, subgroupTree] of Object.entries(contractsTree)) {
        for (const [subgroupName, commoditiesTree] of Object.entries(subgroupTree)) {
            for (const [commodityName, byReportType] of Object.entries(commoditiesTree)) {
                for (const contract of byReportType[CFTCReportType.FinancialFutures]) {
                    dst.push({
                        commodityGroupName,
                        subgroupName,
                        commodityName,
                        cftcCode: contract.cftcContractMarketCode,
                    });
                }
                for (const contract of byReportType[CFTCReportType.Disaggregated]) {
                    dst.push({
                        commodityGroupName,
                        subgroupName,
                        commodityName,
                        cftcCode: contract.cftcContractMarketCode,
                    });
                }
                for (const contract of byReportType[CFTCReportType.Legacy]) {
                    dst.push({
                        commodityGroupName,
                        subgroupName,
                        commodityName,
                        cftcCode: contract.cftcContractMarketCode,
                    });
                }
            }
        }
    }
    return dst;
}
