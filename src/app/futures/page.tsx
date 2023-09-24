import { allCapsToSlug, allCapsToTitle, slugToTitle } from "@/lib/cftc_api_utils";
import { fetchAllAvailableContracts } from "@/lib/socrata_api";
import GroupTree from "./group_tree";

export default async function Page() {
    const contractsTree = await fetchAllAvailableContracts(allCapsToSlug);
    return (
        <div className="my-2">
            <h1 className="block">Futures</h1>
            {Object.entries(contractsTree).map(([commodityGroupName, groupTree], idx) => {
                return (
                    <GroupTree
                        key={idx}
                        commodityGroupTree={groupTree}
                        commodityGroupNameTitle={slugToTitle(commodityGroupName)}
                    />
                )
            })}
        </div>
    );
}