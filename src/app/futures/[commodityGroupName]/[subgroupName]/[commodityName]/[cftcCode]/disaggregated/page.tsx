import { CFTCCommodityGroupType, CFTCReportType } from "@/common_types";
import Disaggregated from "./disaggregated";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";
import Breadcrumbs from "@/components/breadcrumbs";
import { allCapsToSlug } from "@/lib/cftc_api_utils";
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
        CFTCReportType.Disaggregated,
        cftcCode,
    );
    return (
        <div className="min-h-screen">
            <Breadcrumbs
                params={params}
                reportType={"Disaggregated"}
            />
            {contract && (<Disaggregated contract={contract} />)}
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
    console.log(JSON.stringify(mapToObject(res), null, 4));
    for (const [commodityGroupName, subtree1] of res.entries()) {
        console.log(`${commodityGroupName}: typeof subtree1: ${typeof subtree1}, ${JSON.stringify(mapToObject(subtree1 as CCTree2), null, 2)}`)
        for (const [subgroupName, subtree2] of (subtree1 as CCTree2).entries())  {
            console.log(`${commodityGroupName}: typeof subtree2: ${typeof subtree2} , ${JSON.stringify(subtree2)}`)
            console.log(`group: ${commodityGroupName}, subgroupName: ${subgroupName}, ${Object.keys(mapToObject(subtree2 as CCTree2))}`)
            for (const [commodityName, subtree3] of (subtree2 as CCTree2).entries()) {
                for (const contr of (subtree3 as CommodityContractKindVariants[])) {
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
