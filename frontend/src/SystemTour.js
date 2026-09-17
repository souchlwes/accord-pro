import React, { useState, useEffect } from 'react';
import Joyride, { STATUS } from 'react-joyride';

export default function SystemTour({ forceRun, onTourClose }) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Check if they are a completely new user
    const hasSeenTour = localStorage.getItem('accord_tour_completed');
    
    // If they haven't seen it, or if they clicked "Replay Tour", run it.
    if (!hasSeenTour || forceRun) {
      setRun(true);
    }
  }, [forceRun]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    // If the user clicks "Skip" or finishes the tour, save it to memory so it never runs again
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
    },
    {
      target: '#tour-chat-btn',
      content: 'Need to contact a proctor or broadcast an announcement? Your global communication hub is right here.',
      placement: 'right',
    },
    {
      target: '#tour-help-btn',
      content: 'If you ever forget a rule or need to replay this tour, click the Smart Help center.',
      placement: 'right',
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#2563eb', // Blue-600 to match Accord Pro
          backgroundColor: '#0f172a', // Slate-900
          textColor: '#f8fafc', // Slate-50
          arrowColor: '#0f172a',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 10000,
        },
        buttonClose: { display: 'none' }, // Hides the tiny X in favor of the Skip button
        buttonSkip: { color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
        buttonNext: { backgroundColor: '#2563eb', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', padding: '10px 16px' },
        buttonBack: { color: '#cbd5e1', marginRight: '8px' },
        tooltipContainer: { textAlign: 'left' }
      }}
    />
  );
}
