import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import { allCapsToTitle, allCapsToSlug, slugToTitle } from "@/lib/cftc_api_utils";
import Tff from "./tff";
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
    const contract = contractsTree.getCommodityContract(
        commodityGroupNameSlug,
        subgroupNameSlug,
        commodityNameSlug,
        CFTCReportType.FinancialFutures,
        cftcCode,
    );
    return (
        <div className="min-h-screen">
            <Breadcrumbs
                params={params}
                reportType={"Traders in Financial Futures"}
            />
            {contract && (<Tff contract={contract} />)}
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
