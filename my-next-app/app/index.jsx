"use client";

import React from "react";
import Image from "next/image";
import WFRLogo from "../public/WFR_DAQ_Logo.png"; // Place your image in the public/assets folder

export default function Home() {
    return (
        <div className="home">
            <Image
                src={WFRLogo}
                alt="Western Formula Racing Data Acquisition Logo"
                width={800} // Adjust dimensions as needed
                height={400}
                style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }}
            />
            <h1>Western Formula Racing Data Acquisition</h1>
        </div>
    );
}