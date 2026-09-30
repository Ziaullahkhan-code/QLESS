import React from 'react';
import { Restaurant, QueueToken, QueueMetrics } from '../types';
import { GeoCoordinates } from '../hooks/useGeolocation';
import { CustomerView } from './CustomerView';
import { StaffDashboard } from './StaffDashboard';
import { ArrowRightLeft } from 'lucide-react';

interface SplitViewProps {
  restaurants: Restaurant[];
  coords: GeoCoordinates;
  gpsStatus: 'idle' | 'locating' | 'granted' | 'denied' | 'preset';
  errorMessage: string | null;
  userToken: QueueToken | null;
  userPosition: number;
  userRestaurant?: Restaurant;
  allTokens: QueueToken[];
  selectedStaffRestaurantId: string;
  onSelectStaffRestaurant: (id: string) => void;
  activeQueue: QueueToken[];
  currentlyServing?: QueueToken;
  metrics: QueueMetrics;
  counterTimeoutSeconds?: number;
  onSetTimeout?: (sec: number) => void;
  onOpenGpsModal: () => void;
  onClaimToken: (restaurantId: string, partySize: number, name?: string, phone?: string) => void;
  onCancelToken: (tokenId: string) => void;
  onRejoinQueue: (tokenId: string) => void;
  onServeNext: (restaurantId: string, counterName: string) => void;
  onSkipToken: (tokenId: string, reason?: string) => void;
  onCompleteService: (tokenId: string) => void;
  onRecallToken: (tokenId: string, counterName?: string) => void;
  onAddWalkIn: (restaurantId: string, partySize: number, name?: string, notes?: string) => void;
  onResetQueue: (restaurantId: string) => void;
}

export const SplitView: React.FC<SplitViewProps> = (props) => {
  return (
    <div className="space-y-6">
      {/* Simulation banner in Light Theme */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-extrabold text-slate-900">
            Dual Interactive Testing Mode:
          </span>
          <span className="hidden sm:inline text-slate-600">
            Click &apos;Get Token&apos; on the Customer side (left), then click &apos;SERVE NEXT&apos; on the Staff side (right) to hear voice announcements &amp; observe real-time sync.
          </span>
        </div>
        <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 font-bold shrink-0">
          Sync Connected
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Left Column: Customer View */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 tracking-wider uppercase">Customer Mobile View</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">SMCHS Radar &amp; Live Pass</span>
          </div>

          <CustomerView
            restaurants={props.restaurants}
            coords={props.coords}
            gpsStatus={props.gpsStatus}
            errorMessage={props.errorMessage}
            userToken={props.userToken}
            userPosition={props.userPosition}
            userRestaurant={props.userRestaurant}
            allTokens={props.allTokens}
            onOpenGpsModal={props.onOpenGpsModal}
            onClaimToken={props.onClaimToken}
            onCancelToken={props.onCancelToken}
            onRejoinQueue={props.onRejoinQueue}
          />
        </div>

        {/* Right Column: Staff Station */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 tracking-wider uppercase">Staff Dispatch Console</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Voice Dispatch &amp; Active Queue</span>
          </div>

          <StaffDashboard
            restaurants={props.restaurants}
            selectedRestaurantId={props.selectedStaffRestaurantId}
            onSelectRestaurant={props.onSelectStaffRestaurant}
            activeQueue={props.activeQueue}
            currentlyServing={props.currentlyServing}
            metrics={props.metrics}
            counterTimeoutSeconds={props.counterTimeoutSeconds}
            onSetTimeout={props.onSetTimeout}
            onServeNext={props.onServeNext}
            onSkipToken={props.onSkipToken}
            onCompleteService={props.onCompleteService}
            onRecallToken={props.onRecallToken}
            onAddWalkIn={props.onAddWalkIn}
            onResetQueue={props.onResetQueue}
          />
        </div>
      </div>
    </div>
  );
};
