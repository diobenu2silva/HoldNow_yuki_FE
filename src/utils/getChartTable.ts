"use client";

import { ChartTable } from "./types";
import { BACKEND_URL } from "./util";

export async function getChartTable({
    pairIndex,
    from,
    to,
    range,
    token,
    countBack,
    claimAmount
}: {
    pairIndex: number;
    from: number;
    to: number;
    range: number;
    token: string;
    countBack: number;
    claimAmount?: any; 
}): Promise<ChartTable> {
    try {
        const res = await fetch(
            `${BACKEND_URL}/chart/${range}/${token}/${countBack}`,
        ).then((data) => data.json());

        if (!res) {
            throw new Error();
        }
        return res as ChartTable;
    } catch (err) {
        return Promise.reject(new Error("Failed at fetching charts"));
    }
}
