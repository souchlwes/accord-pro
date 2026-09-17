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
          {index === 3 ? 'Finish Tour' : 'Next Step'}
        </button>
      </div>
      
    </div>
  );
};

export default function SystemTour({ forceRun, onTourClose }) {
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

  const steps = [
    {
      target: 'body',
      content: 'Welcome to Accord Pro! Let’s take a quick 10-second tour to show you where everything is.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '#tour-nav-dashboard',
      content: 'This is your main command center. You will find all your schedules and master timelines here.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#tour-chat-btn',
      content: 'Need to contact a proctor or broadcast an announcement? Your global communication hub is right here.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#tour-help-btn',
      content: 'If you ever forget a rule or need to replay this tour, click the Smart Help center.',
      placement: 'right',
      disableBeacon: true,
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      disableOverlayClose={true} // Forces them to click Next or the X
      tooltipComponent={CustomTooltip} // INJECTS OUR CUSTOM TAILWIND UI
      callback={handleJoyrideCallback}
      floaterProps={{
        styles: {
          floater: { filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.5))' },
          arrow: { display: 'none' } // Hiding the arrow makes it look cleaner with heavy rounded borders
        }
      }}
      styles={{
        options: {
          overlayColor: 'rgba(15, 23, 42, 0.85)', // A dark slate overlay instead of pure black
          zIndex: 10000,
        }
      }}
    />
  );
}
