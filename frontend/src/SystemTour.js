import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { X } from 'lucide-react';

// --- CUSTOM ACCORD PRO STYLED TOOLTIP ---
const CustomTooltip = ({ index, step, backProps, closeProps, primaryProps, tooltipProps }) => {
  return (
    <div {...tooltipProps} className="bg-slate-900 text-white p-6 rounded-[2rem] w-[320px] md:w-[380px] shadow-2xl border-[3px] border-blue-600 font-sans">
      
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">
          Accord Tour • Step {index + 1}
        </h4>
        <button {...closeProps} className="text-slate-400 hover:text-rose-500 transition-colors bg-white/10 p-1.5 rounded-full" title="Skip Tour">
          <X size={14} />
        </button>
      </div>
      
      <p className="text-sm font-bold leading-relaxed mb-8 text-slate-200">
        {step.content}
      </p>
      
      <div className="flex justify-between items-center pt-4 border-t border-white/10">
        {index > 0 ? (
          <button {...backProps} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors p-2">
            Back
          </button>
        ) : (
          <span /> // Empty placeholder to keep the flex spacing aligned
        )}
        <button {...primaryProps} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
          {step.isLast ? 'Finish Tour' : 'Next Step'}
        </button>
      </div>
      
    </div>
  );
};

export default function SystemTour({ forceRun, onTourClose, role }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('accord_tour_completed');
    if (!hasSeenTour || forceRun) {
      setRun(true);
    }
  }, [forceRun]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      localStorage.setItem('accord_tour_completed', 'true');
      setRun(false);
      if (onTourClose) onTourClose();
    }
  };

  // --- DYNAMIC ROLE-BASED LOGIC ---
  const getSteps = () => {
    if (role === 'PROCTOR') {
      return [
        {
          target: 'body',
          content: 'Welcome to your Proctor Dashboard. This is your personal hub for managing your schedule and accepting assignments.',
          placement: 'center',
          disableBeacon: true,
        },
        {
          target: '#tour-itinerary',
          content: 'Your confirmed daily itinerary. If you need to flag an emergency or review your room assignments, check here.',
          placement: 'left',
          disableBeacon: true,
        },
        {
          target: '#availability-log-section',
          content: 'The Availability Log Book. You MUST log your free time here manually or via Excel so the generator can assign you.',
          placement: 'top',
          disableBeacon: true,
        },
        {
          target: '#tour-nav-dashboard',
          content: 'Watch your notification bell here for instant Reliever Requests if an admin needs you to cover an emergency shift.',
          placement: 'right',
          disableBeacon: true,
          isLast: true
        }
      ];
    } 
    
    if (role === 'DEPT_ADMIN') {
      return [
        {
          target: 'body',
          content: 'Welcome to your Department Workspace. Manage your specific rooms, subjects, and proctor pool here.',
          placement: 'center',
          disableBeacon: true,
        },
        {
          target: '#tour-workspaces',
          content: 'Your isolated Department Hub. Configure your local rooms and subjects, and manage your internal proctors.',
          placement: 'top',
          disableBeacon: true,
        },
        {
          target: '#tour-conflict-engine',
          content: 'The Re-Validation Engine runs automatically when you generate a draft to prevent proctor overlaps and room double-bookings.',
          placement: 'bottom',
          disableBeacon: true,
        },
        {
          target: '#tour-system-registry',
          content: 'Your local registry. Approve new proctors who use your 6-character Invite Code here.',
          placement: 'top',
          disableBeacon: true,
          isLast: true
        }
      ];
    }

    // Default to HEAD_ADMIN
    return [
      {
        target: 'body',
        content: 'Welcome to your University Master View. This dashboard grants you global oversight of all department workspaces, timelines, and staff registries.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '#tour-conflict-engine',
        content: 'The Re-Validation Engine lives here. It continuously runs conflict detection to instantly flag overlapping rooms or double-booked proctors across the entire campus.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '#tour-workspaces',
        content: 'These are your isolated Department Workspaces. Each uses a unique 6-character Invite Code to securely route new staff into the correct branch.',
        placement: 'top',
        disableBeacon: true,
      },
      {
        target: '#tour-master-timeline',
        content: 'Your Global Resource Monitor. This gives you a complete, read-only oversight of the live University Master Timeline.',
        placement: 'top',
        disableBeacon: true,
      },
      {
        target: '#tour-system-registry',
        content: 'Identity & Access Management (IAM). Maintain strict access control here. Unverified staff hit a PENDING wall until you approve them.',
        placement: 'top',
        disableBeacon: true,
        isLast: true
      }
    ];
  };

  return (
    <Joyride
      steps={getSteps()}
      run={run}
      continuous={true}
      disableOverlayClose={true}
      tooltipComponent={CustomTooltip}
      callback={handleJoyrideCallback}
      floaterProps={{
        styles: {
          floater: { filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.5))' },
          arrow: { display: 'none' }
        }
      }}
      styles={{
        options: {
          overlayColor: 'rgba(15, 23, 42, 0.85)',
          zIndex: 10000,
        }
      }}
    />
  );
}
