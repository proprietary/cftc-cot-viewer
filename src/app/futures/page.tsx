import { allCapsToSlug, allCapsToTitle, slugToTitle } from "@/lib/cftc_api_utils";
import { fetchAllAvailableContracts } from "@/lib/socrata_api";
import GroupTree from "./group_tree";
import Link from "next/link";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";
import Breadcrumbs from "@/components/breadcrumbs";

export default async function Page() {
    const contractsTree = await FetchAllAvailableContracts();
    return (
        <div className="flex flex-col min-h-screen mx-auto w-11/12">

            <Breadcrumbs />

            <h1 className="block">Futures</h1>
            {contractsTree.getGroupNames().map((commodityGroupName, idx) => {
                return (
                    <div key={idx} className="block my-5 text-lg">
                        <Link
                            className="cursor-pointer text-blue-700 hover:text-gray-100"
                            href={`/futures/${commodityGroupName}`}
                        >
                            {slugToTitle(commodityGroupName)}
                        </Link>
                    </div>
                )
            })}
        </div>
    );
}