'use client';

import React from 'react';

export default function Navbar() {
    const [open, setOpen] = React.useState(false);
    return (
        <header className="bg-slate-800 bg-opacity-90 w-full">
            <nav className="flex flex-wrap items-center filter drop-shadow-md w-full px-4 py-4 text-lg text-gray-700">
                <div className="block h-6 w-6 md:hidden" onClick={() => { setOpen(!open); }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                    </svg>
                </div>

                <div className={`w-full md:flex md:items-center md:w-auto ${!open && "hidden"}`}>
                    <ul className="pt-4 text-base text-slate-200 md:flex md:justify-between md:pt-0">
                        <li><a className="md:p-4 block py-2 hover:text-indigo-300" href="/">Home</a></li>
                        <li><a className="md:p-4 block py-2 hover:text-indigo-300" href="/futures/financial-instruments">Financial</a></li>
                        <li><a className="md:p-4 block py-2 hover:text-indigo-300" href="/futures/agriculture">Agriculture</a></li>
                        <li><a className="md:p-4 block py-2 hover:text-indigo-300" href="/futures/natural-resources">Natural Resources</a></li>
                    </ul>
                </div>
            </nav>
        </header>
    )
}