"use client";

import "./globals.css"; // Ensure your CSS file is imported
import Link from "next/link";
import React from "react";


export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body>
        <nav className="navbar">
            <div className="container">
                <ul className="nav-links">
                    <li>
                        <Link href="/">Home</Link>
                    </li>
                    <li>
                        <Link href="/fsae-simulator">FSAE Simulator</Link>
                    </li>
                    <li>
                        <Link href="/fsae-simulator">Aero</Link>
                    </li>
                    <li>
                        <Link href="/fsae-simulator">Brakes/Pedals</Link>
                    </li>
                    <li>
                        <Link href="/DynamicCharts">GLV</Link>
                    </li>
                    <li>
                        <Link href="/fsae-simulator">Suspension</Link>
                    </li>
                    <li>
                        <Link href="/fsae-simulator">Wheels/Tires</Link>
                    </li>
                    <li>
                        <Link href="/WFRDownloader">WFR Downloader</Link>
                    </li>
                </ul>
            </div>
        </nav>
        <main className="content">{children}</main>
        </body>
        </html>
    );
}