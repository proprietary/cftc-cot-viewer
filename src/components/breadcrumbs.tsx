import Link from 'next/link';
import { slugToTitle } from '@/lib/cftc_api_utils';

export interface COTURLParams {
    commodityGroupName?: string,
    subgroupName?: string,
    commodityName?: string,
    cftcCode?: string,
}

export default function Breadcrumbs({
    params,
    reportType,
}: {
    params: COTURLParams,
    reportType?: string,
}) {
    return (
        <nav aria-label="breadcrumbs" className="rounded-lg block p-2 overflow-x-auto">
            <ol className="list-reset flex text-gray-700">
                <li className="flex items-center text-sm">
                    <Link href={`/`} className="text-blue-500 hover:text-blue-700">
                        Home
                    </Link>
                    <div className="pl-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-caret-right-fill" viewBox="0 0 16 16">
                            <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                        </svg>
                    </div>
                </li>
                <li className="flex items-center px-2 text-sm text-blue-500 hover:text-blue-700 last-of-type:text-gray-500">
                    <Link href={`/futures`}>
                        Futures
                    </Link>
                    <div className="pl-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-caret-right-fill" viewBox="0 0 16 16">
                            <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                        </svg>
                    </div>
                </li>
                {params.commodityGroupName != null && (
                    <li className="flex items-center px-2 text-sm text-blue-500 hover:text-blue-700 last-of-type:text-gray-500">
                        <Link href={`/futures/${params.commodityGroupName}`}>
                            {slugToTitle(decodeURIComponent(params.commodityGroupName))}
                        </Link>
                        <div className="pl-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-caret-right-fill" viewBox="0 0 16 16">
                                <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                            </svg>
                        </div>
                    </li>
                )}
                {params.subgroupName != null && (
                    <li className="flex items-center px-2 text-sm text-blue-500 hover:text-blue-700 last-of-type:text-gray-500">
                        <Link href={`/futures/${params.commodityGroupName}/${params.subgroupName}`}>
                            {slugToTitle(decodeURIComponent(params.subgroupName))}
                        </Link>
                        <div className="pl-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-caret-right-fill" viewBox="0 0 16 16">
                                <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                            </svg>
                        </div>
                    </li>
                )}
                {params.commodityName != null && (
                    <li className="flex items-center px-2 text-sm text-blue-500 hover:text-blue-700 last-of-type:text-gray-500">
                        <Link href={`/futures/${params.commodityGroupName}/${params.subgroupName}/${params.commodityName}`}>
                            {slugToTitle(decodeURIComponent(params.commodityName))}
                        </Link>
                        <div className="pl-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-caret-right-fill" viewBox="0 0 16 16">
                                <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                            </svg>
                        </div>
                    </li>
                )}
                {params.cftcCode != null && (
                    <li className="flex items-center px-2 text-sm text-blue-500 hover:text-blue-700 last-of-type:text-gray-500">
                        <Link href={`/futures/${params.commodityGroupName}/${params.subgroupName}/${params.commodityName}/${params.cftcCode}`}>
                            CFTC Contract #{params.cftcCode}
                        </Link>
                        <div className="pl-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-caret-right-fill" viewBox="0 0 16 16">
                                <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
                            </svg>
                        </div>
                    </li>
                )}
                {reportType != null && (
                    <li className="flex items-center px-5 text-gray-500 font-semibold text-sm">
                        {reportType}
                    </li>
                )}
            </ol>
        </nav>
    );
}