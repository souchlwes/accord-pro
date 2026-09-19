export default function SystemTour({ forceRun, onTourClose, role }) {
  const [run, setRun] = useState(false);
  const [tourKey, setTourKey] = useState(0); 

  useEffect(() => {
    // Wait until the user's role has actually loaded from the DB
    if (!role) return; 

    const storageKey = `accord_tour_completed_${role}`;
    // Strict boolean evaluation to prevent truthy string bugs
    const hasSeenTour = localStorage.getItem(storageKey) === 'true';
    
    if (forceRun) {
      setTourKey(prev => prev + 1); 
      setRun(true);
    } else if (!hasSeenTour) {
      setRun(true);
    } else {
      setRun(false); 
    }
  }, [forceRun, role]);

  const handleJoyrideCallback = (data) => {
    const { status, action, type } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    // Bulletproof catch for 'X' clicks, 'Finish' clicks, and internal Joyride unmounts
    if (finishedStatuses.includes(status) || action === 'close' || type === 'tour:end') {
      if (role) {
        localStorage.setItem(`accord_tour_completed_${role}`, 'true');
      }
      setRun(false);
      if (onTourClose) onTourClose();
    }
  };

  const getAdminNavSteps = () => [
    { target: '#tour-nav-dashboard', content: 'Dashboard Tab: Returns you to your system health metrics, workspaces, and timelines.', placement: 'right', disableBeacon: true },
    { target: '#tour-nav-users', content: 'User Registry Tab: Opens your Identity & Access Management table to approve or block staff accounts.', placement: 'right', disableBeacon: true },
    { target: '#tour-ai-btn', content: 'Chat Support: Need to troubleshoot an error? Open the ACCORD Assistant and upload a screenshot for instant analysis.', placement: 'right', disableBeacon: true },
    { target: '#tour-chat-btn', content: 'Campus Chat: Direct message your proctors or broadcast emergency announcements globally.', placement: 'right', disableBeacon: true },
    { target: '#tour-notify-btn', content: 'Action Logs: Every declined assignment, new registration, and system flag appears in this notification hub.', placement: 'right', disableBeacon: true },
    { target: '#tour-settings-btn', content: 'Account Settings: Update your secure password and verify new email addresses here.', placement: 'right', disableBeacon: true },
    { target: '#tour-logout-btn', content: 'Logout: Securely sever your connection to the database.', placement: 'right', disableBeacon: true },
    { target: '#tour-help-btn', content: 'Smart Help: Click this anytime to reread the system rules or replay this entire tour!', placement: 'right', disableBeacon: true, isLast: true }
  ];

  const getSteps = () => {
    if (role === 'PROCTOR') {
      return [
        { target: 'body', content: 'Welcome to your Proctor Dashboard. This is your personal dispatch hub for managing schedules and accepting relief assignments.', placement: 'center', disableBeacon: true },
        { target: '#tour-itinerary', content: 'Your confirmed daily itinerary. This updates instantly if an admin switches your schedule.', placement: 'left', disableBeacon: true },
        { target: '#availability-log-section', content: 'The Availability Log Book. The Re-Validation engine will ONLY assign you to exams during the hours you explicitly log here.', placement: 'top', disableBeacon: true },
        { target: '#tour-proctor-ai', content: 'AI Support: Facing a system error? Open this headset icon and ask the AI assistant for troubleshooting steps.', placement: 'bottom', disableBeacon: true },
        { target: '#tour-proctor-chat', content: 'Communication Hub: Message your Department Head directly if you have scheduling concerns.', placement: 'bottom', disableBeacon: true },
        { target: '#tour-proctor-notify', content: 'Action Alerts: Watch this bell. If an admin dispatches you for an emergency reliever request, it will pop up here.', placement: 'bottom', disableBeacon: true },
        { target: '#tour-proctor-settings', content: 'Account Settings: Manage your password security and email routing here.', placement: 'bottom', disableBeacon: true },
        { target: '#tour-proctor-logout', content: 'Logout: Securely end your session.', placement: 'bottom', disableBeacon: true },
        { target: '#tour-proctor-help', content: 'Smart Help: Review system constraints and rules, or replay this tour anytime.', placement: 'bottom', disableBeacon: true, isLast: true }
      ];
    } 
    
    if (role === 'DEPT_ADMIN') {
      return [
        { target: 'body', content: 'Welcome to your Department Workspace. Manage your specific rooms, subjects, and isolated proctor pool here.', placement: 'center', disableBeacon: true },
        { target: '#tour-workspaces', content: 'Your Isolated Hub: Use your 6-character Invite Code to securely invite proctors into this specific department.', placement: 'top', disableBeacon: true },
        { target: '#tour-conflict-engine', content: 'The Re-Validation Engine runs automatically when you manually edit a schedule, blocking overlaps instantly.', placement: 'bottom', disableBeacon: true },
        { target: '#tour-system-registry', content: 'Local Registry: Review and approve new proctors who use your invite code to request access.', placement: 'top', disableBeacon: true },
        ...getAdminNavSteps()
      ];
    }

    return [
      { target: 'body', content: 'Welcome to your University Master View. This dashboard grants you global oversight of all workspaces, metrics, and staff.', placement: 'center', disableBeacon: true },
      { target: '#tour-conflict-engine', content: 'System Health & Engine: Continuously scans your database to flag active double-bookings and tracks campus-wide proctor readiness.', placement: 'bottom', disableBeacon: true },
      { target: '#tour-workspaces', content: 'Department Hubs: Distribute the Invite Codes found on these cards to route new staff into the correct branch.', placement: 'top', disableBeacon: true },
      { target: '#tour-master-timeline', content: 'Global Resource Monitor: View the live University Master Timeline and export the campus-wide PDF itinerary.', placement: 'top', disableBeacon: true },
      { target: '#tour-system-registry', content: 'Global IAM Gateway: Maintain absolute access control. Unverified staff hit a PENDING wall until you approve them here.', placement: 'top', disableBeacon: true },
      ...getAdminNavSteps()
    ];
  };

  return (
    <Joyride
      key={tourKey} 
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
      styles={{ options: { overlayColor: 'rgba(15, 23, 42, 0.85)', zIndex: 10000 } }}
    />
  );
}
