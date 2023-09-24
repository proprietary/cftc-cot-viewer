import { allCapsToSlug, allCapsToTitle, slugToTitle } from "@/lib/cftc_api_utils";
import { fetchAllAvailableContracts } from "@/lib/socrata_api";
import GroupTree from "./group_tree";
import Link from "next/link";
import { FetchAllAvailableContracts } from "@/lib/fetchAvailableContracts";

export default async function Page() {
    const contractsTree = await FetchAllAvailableContracts();
    return (
        <div className="my-2">

            <nav aria-label="breadcrumbs" className="rounded-lg block my-2">
                <ol className="list-reset flex text-gray-700">
                    <li>
                        <Link href={`/`} className="text-blue-500 hover:text-blue-700">
                            Home
                        </Link>
                    </li>
                    <li>
                        Futures
                    </li>
                </ol>
            </nav>


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