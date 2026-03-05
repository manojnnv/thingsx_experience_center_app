"use client";

import { useState, useEffect, useCallback } from "react";
import { useSetQueryParam } from "./useSetQueryParam";

const INTRO_SEEN_PREFIX = "thingsx_intro_seen_";

interface UseExperienceStateOptions {
    /** Unique key for this experience page (e.g., "sensors", "retail", "warehouse") */
    pageKey: string;
    /** Available tabs for this page */
    tabs: readonly string[];
    /** Default tab to show */
    defaultTab: string;
}

interface UseExperienceStateReturn {
    /** Whether the hook has finished initializing (sessionStorage check complete) */
    isReady: boolean;
    /** Whether to show the video intro */
    showVideo: boolean;
    /** Skip the video intro and mark as seen */
    skipVideo: () => void;
    /** Replay the video intro (clears the session flag) */
    replayIntro: () => void;
    /** Currently active tab */
    activeTab: string;
    /** Change the active tab (updates URL) */
    setActiveTab: (tab: string) => void;
}

/**
 * Hook to manage experience page state with persistence.
 * - Video intro skip status is stored in sessionStorage (resets per tab/session)
 * - Active tab is stored in URL query params for deep linking (uses useSetQueryParam)
 * - Returns isReady=false until sessionStorage check is complete to prevent flash
 */
export function useExperienceState({
    pageKey,
    tabs,
    defaultTab,
}: UseExperienceStateOptions): UseExperienceStateReturn {
    // Use the generic query param hook for tab state
    const [tabParam, setTabParam] = useSetQueryParam("tab");

    // Determine active tab from URL or use default
    const activeTab = tabParam && tabs.includes(tabParam) ? tabParam : defaultTab;

    // Track if we've finished checking sessionStorage
    const [isReady, setIsReady] = useState(false);

    // Start with showVideo=true, will be updated after sessionStorage check
    const [showVideo, setShowVideo] = useState(true);

    // Check sessionStorage AFTER hydration to avoid server/client mismatch
    useEffect(() => {
        const seen = sessionStorage.getItem(`${INTRO_SEEN_PREFIX}${pageKey}`);
        if (seen === "true") {
            setShowVideo(false);
        }
        // Mark as ready after sessionStorage check
        setIsReady(true);
    }, [pageKey]);

    // Skip video and persist to sessionStorage
    const skipVideo = useCallback(() => {
        setShowVideo(false);
        sessionStorage.setItem(`${INTRO_SEEN_PREFIX}${pageKey}`, "true");
    }, [pageKey]);

    // Replay intro: clear session flag and re-show
    const replayIntro = useCallback(() => {
        sessionStorage.removeItem(`${INTRO_SEEN_PREFIX}${pageKey}`);
        setShowVideo(true);
    }, [pageKey]);

    // Set active tab (wraps the setTabParam for type consistency)
    const setActiveTab = useCallback(
        (tab: string) => {
            setTabParam(tab);
        },
        [setTabParam]
    );

    return {
        isReady,
        showVideo,
        skipVideo,
        replayIntro,
        activeTab,
        setActiveTab,
    };
}

