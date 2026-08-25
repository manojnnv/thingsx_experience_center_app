"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Hook to manage a single URL query parameter with a React-like API.
 * Returns [value, setValue] tuple similar to useState.
 * 
 * @param key - The query parameter key
 * @returns [currentValue, setValueFunction] tuple
 * 
 * @example
 * const [tab, setTab] = useSetQueryParam("tab");
 * setTab("analytics"); // URL becomes ?tab=analytics
 * setTab(null);        // Removes ?tab from URL
 */
export function useSetQueryParam(key: string) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const value = searchParams.get(key);

    const setValue = (newValue: string | null) => {
        const params = new URLSearchParams(searchParams);

        if (newValue === null) {
            params.delete(key);
        } else {
            params.set(key, newValue);
        }

        const url = `${pathname}?${params.toString()}`;
        router.replace(url, { scroll: false });
    };

    return [value, setValue] as const;
}
