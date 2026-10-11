import React, { useState, useEffect } from "react";
import SeniScoringView from "./components/SeniScoringView";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <ErrorBoundary fallbackTitle="JRZ SCORE TGR - PEMULIHAN SISTEM">
      <div id="jrz-score-tgr-app-root" className="min-h-screen bg-[#040813] text-white selection:bg-cyan-500 selection:text-black">
        <SeniScoringView isFullscreen={isFullscreen} />
        <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}

