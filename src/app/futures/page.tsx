import {
    allCapsToSlug,
    allCapsToTitle,
    slugToTitle,
} from '@/lib/cftc_api_utils'
import { fetchAllAvailableContracts } from '@/lib/socrata_api'
import GroupTree from './group_tree'
import Link from 'next/link'
import { FetchAllAvailableContracts } from '@/lib/fetchAvailableContracts'
import Breadcrumbs from '@/components/breadcrumbs'

export default async function Page() {
    const contractsTree = await FetchAllAvailableContracts()
    return (
        <div className="flex flex-col min-h-screen mx-auto w-11/12">
            <Breadcrumbs params={{}} />

            <h1 className="text-2xl antialiased my-5">Futures</h1>
            {contractsTree.getGroupNames().map((commodityGroupName, idx) => {
                return (
                    <div key={idx} className="block my-5 text-lg">
                        <Link
                            className="cursor-pointer text-blue-500 hover:text-blue-700"
                            href={`/futures/${commodityGroupName}`}
                        >
                            {slugToTitle(commodityGroupName)}
                        </Link>
                    </div>
                )
            })}
        </div>
    )
}
