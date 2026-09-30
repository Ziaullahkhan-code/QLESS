/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveView, QueueToken } from './types';
import { useGeolocation } from './hooks/useGeolocation';
import { useQueueState } from './hooks/useQueueState';
import { Header } from './components/Header';
import { CustomerView } from './components/CustomerView';
import { StaffDashboard } from './components/StaffDashboard';
import { SplitView } from './components/SplitView';
import { TVDisplayView } from './components/TVDisplayView';
import { GpsLocationModal } from './components/GpsLocationModal';
import { OrderCompleteModal } from './components/OrderCompleteModal';
import { TokenExpiredModal } from './components/TokenExpiredModal';
import { Logo } from './components/Logo';
import { ChevronRight } from 'lucide-react';
import { playClickSound } from './services/sound';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('customer');
  const [selectedStaffRestaurantId, setSelectedStaffRestaurantId] = useState<string>('rest-burger-lab');
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  
  // State for the "Thanks!" Order Complete Pop-up
  const [completedTokenModalData, setCompletedTokenModalData] = useState<QueueToken | null>(null);

  // GPS Geolocation Hook (Defaults to fixed SMCHS / Bahadurabad, Karachi anchor)
  const {
    coords,
    status: gpsStatus,
    errorMessage: gpsError,
    activePresetId,
    requestGpsLocation,
    selectPresetLocation,
  } = useGeolocation();

  // Reactive Queue State Hook
  const {
    restaurants,
    allTokens,
    userToken,
    userPosition,
    userRestaurant,
    activeQueue,
    currentlyServing,
    metrics,
    counterTimeoutSeconds,
    setCounterTimeoutSeconds,
    latestExpiredNotification,
    dismissExpiredNotification,
    claimToken,
    serveNext,
    skipToken,
    completeService,
    recallToken,
    cancelToken,
    rejoinQueue,
    addWalkIn,
    resetQueue,
  } = useQueueState(selectedStaffRestaurantId);

  // If user claims a token, sync the staff dashboard restaurant to that venue automatically
  useEffect(() => {
    if (userToken && userToken.restaurantId) {
      setSelectedStaffRestaurantId(userToken.restaurantId);
    }
  }, [userToken?.restaurantId]);

  // Wrapper for completeService to trigger the celebratory "Thanks!" Pop-up modal
  const handleCompleteService = (tokenId: string) => {
    const finishedToken = completeService(tokenId);
    if (finishedToken) {
      setCompletedTokenModalData(finishedToken);
    }
  };

  // Keyboard navigation shortcuts: 1 for Customer, 2 for Business, 3 for Split
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '1') {
        playClickSound();
        setActiveView('customer');
      }
      if (e.key === '2') {
        playClickSound();
        setActiveView('business');
      }
      if (e.key === '3') {
        playClickSound();
        setActiveView('split');
      }
      if (e.key === '4') {
        playClickSound();
        setActiveView('display');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Connect to backend Server-Sent Events (SSE) for multi-device real-time sync
  useEffect(() => {
    try {
      const eventSource = new EventSource('/api/events');
      eventSource.onmessage = () => {
        // Backend event trigger
      };
      eventSource.onerror = () => {
        eventSource.close();
      };
      return () => {
        eventSource.close();
      };
    } catch {
      // Offline fallback
    }
  }, []);

  const totalWaitingCount = activeQueue.filter((t) => t.status === 'waiting').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Top Header with Prominent View Switcher Toggle */}
      <Header
        activeView={activeView}
        onViewChange={(v) => setActiveView(v)}
        waitingCount={totalWaitingCount}
        hasUserToken={Boolean(userToken && (userToken.status === 'waiting' || userToken.status === 'called'))}
        gpsStatus={gpsStatus}
        onOpenGpsModal={() => setIsGpsModalOpen(true)}
        onResetDemo={() => resetQueue(selectedStaffRestaurantId)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        
        {/* Floating Quick Banner if user has an active ticket and is browsing the Staff view */}
        {activeView === 'business' && userToken && (userToken.status === 'waiting' || userToken.status === 'called') && (
          <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-white border border-blue-200/90 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-2xl bg-blue-600 text-white font-mono font-black text-sm shrink-0 shadow-md">
                {userToken.tokenNumber}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                  <span>Your active customer ticket:</span>
                  <span className="text-blue-600 font-mono font-extrabold">{userToken.tokenNumber}</span>
                  {userToken.status === 'called' ? (
                    <span className="text-emerald-600 font-extrabold uppercase animate-pulse">
                      · Head to {userToken.calledToCounter || 'Counter 3'} immediately!
                    </span>
                  ) : (
                    <span className="text-slate-500 font-normal">
                      · #{userPosition} in line at {userRestaurant?.name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Toggle to Customer View anytime to display your live priority pass.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setActiveView('customer');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shrink-0 cursor-pointer"
            >
              <span>View Pass</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Routing */}
        {activeView === 'customer' && (
          <CustomerView
            restaurants={restaurants}
            coords={coords}
            gpsStatus={gpsStatus}
            errorMessage={gpsError}
            userToken={userToken}
            userPosition={userPosition}
            userRestaurant={userRestaurant}
            allTokens={allTokens}
            onOpenGpsModal={() => setIsGpsModalOpen(true)}
            onClaimToken={claimToken}
            onCancelToken={cancelToken}
            onRejoinQueue={rejoinQueue}
          />
        )}

        {activeView === 'business' && (
          <StaffDashboard
            restaurants={restaurants}
            selectedRestaurantId={selectedStaffRestaurantId}
            onSelectRestaurant={(id) => setSelectedStaffRestaurantId(id)}
            activeQueue={activeQueue}
            currentlyServing={currentlyServing}
            metrics={metrics}
            counterTimeoutSeconds={counterTimeoutSeconds}
            onSetTimeout={setCounterTimeoutSeconds}
            onServeNext={serveNext}
            onSkipToken={skipToken}
            onCompleteService={handleCompleteService}
            onRecallToken={recallToken}
            onAddWalkIn={addWalkIn}
            onResetQueue={resetQueue}
          />
        )}

        {activeView === 'split' && (
          <SplitView
            restaurants={restaurants}
            coords={coords}
            gpsStatus={gpsStatus}
            errorMessage={gpsError}
            userToken={userToken}
            userPosition={userPosition}
            userRestaurant={userRestaurant}
            allTokens={allTokens}
            selectedStaffRestaurantId={selectedStaffRestaurantId}
            onSelectStaffRestaurant={(id) => setSelectedStaffRestaurantId(id)}
            activeQueue={activeQueue}
            currentlyServing={currentlyServing}
            metrics={metrics}
            counterTimeoutSeconds={counterTimeoutSeconds}
            onSetTimeout={setCounterTimeoutSeconds}
            onOpenGpsModal={() => setIsGpsModalOpen(true)}
            onClaimToken={claimToken}
            onCancelToken={cancelToken}
            onRejoinQueue={rejoinQueue}
            onServeNext={serveNext}
            onSkipToken={skipToken}
            onCompleteService={handleCompleteService}
            onRecallToken={recallToken}
            onAddWalkIn={addWalkIn}
            onResetQueue={resetQueue}
          />
        )}

        {activeView === 'display' && (
          <TVDisplayView
            restaurants={restaurants}
            selectedRestaurantId={selectedStaffRestaurantId}
            onSelectRestaurant={(id) => setSelectedStaffRestaurantId(id)}
            activeQueue={activeQueue}
            currentlyServing={currentlyServing}
          />
        )}
      </main>

      {/* Auto-Expired & Reissued Token Notification Modal */}
      <TokenExpiredModal
        notification={latestExpiredNotification}
        onClose={dismissExpiredNotification}
      />

      {/* Celebratory "Thanks!" Order Complete Pop-up Modal */}
      <OrderCompleteModal
        isOpen={Boolean(completedTokenModalData)}
        onClose={() => setCompletedTokenModalData(null)}
        token={completedTokenModalData}
        restaurant={restaurants.find(r => r.id === completedTokenModalData?.restaurantId)}
      />

      {/* GPS Location & Presets Modal */}
      <GpsLocationModal
        isOpen={isGpsModalOpen}
        onClose={() => setIsGpsModalOpen(false)}
        coords={coords}
        status={gpsStatus}
        errorMessage={gpsError}
        activePresetId={activePresetId}
        onRequestGps={requestGpsLocation}
        onSelectPreset={selectPresetLocation}
      />

      {/* Clean Light Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" showTagline={false} />
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Real-Time Voice Queue &amp; Priority Dispatch (SMCHS Karachi Anchor)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span>Hotkeys:</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 border border-slate-200">1</kbd> Customer</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 border border-slate-200">2</kbd> Staff</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 border border-slate-200">3</kbd> Split</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 border border-slate-200">4</kbd> TV</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
