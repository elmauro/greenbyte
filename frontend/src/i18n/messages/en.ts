export const en = {
  header: {
    tagline: 'AgTech innovation · Partnering with Syngenta',
    domain: 'greenbyte-ag.com',
    brandSubtitle: 'Intelligent agriculture',
    demoSignIn: 'Demo sign in',
    demoSignOut: 'Sign out',
    demoSignedInAs: '{user}',
  },
  nav: {
    innovation: 'Innovation',
    precision: 'Precision agriculture',
    sustainability: 'Sustainability',
    news: 'News',
    demoPlant: 'Pasco overview',
    demoPlantUx: 'Line scheduler',
    demoPlantTitle: 'UC1 hub — ingest note, guided tour, and scheduler',
    demoPlantUxTitle: 'UC1 plant capacity — queue, replan, explain, and accept',
    demoPlantFlow: 'UC1 UI↔API',
    demoArchitecture: 'Architecture',
    howItWorks: 'How it works',
  },
  demoCommon: {
    labels: {
      step: 'Step',
      of: 'of',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      restart: 'Restart walkthrough',
    },
    viewPlant: 'View UC1 plant capacity walkthrough',
    viewArchitecture: 'View architecture diagrams',
  },
  howItWorks: {
    navLabel: 'How it works',
    architecture: 'Architecture',
    api: 'UI and API',
  },
  demoPlant: {
    eyebrow: 'Syngenta UC1 · Plant Capacity',
    title: 'Pasco conditioning — guided demo',
    subtitle:
      'Walk through Syngenta’s demo-ready trigger: a rush batch or a failed quality test forces a replan — with plain-language explanation and human sign-off. Concept screens and Pasco-style demo data only.',
    plainLanguage: {
      sectionTitle: 'The idea, in plain language',
      problemHeading: 'What problem are we solving?',
      problem:
        'After harvest, seed goes through cleaning and sizing on production lines. Many batches compete for the same machines. If you run them in the wrong order, the plant looks busy but orders ship late. Today someone reorders the list by hand, under pressure.',
      analogyHeading: 'Think of it like…',
      analogy:
        'A car shop with six jobs booked. A walk-in says “I need my car today.” You shuffle the queue — but you want a clear reason before you bump someone else, especially if switching job types costs an hour of setup.',
      walkthroughHeading: 'What you will see in the six steps below',
      walkthroughSteps: [
        'Line Scheduler panel — pick Line 1 or Line 2 (same control as /demo/plant/ux).',
        'Queue tab — filters, at-risk finish dates, and compare selected orders.',
        'After SAP priority ingest — Scheduling shows the proposed plan, Gantt, copilot rail, and Accept.',
        'After QA fail ingest — Queue shows HOLD; then Scheduling explains the re-sequence.',
        'Scheduling + copilot — reasons per batch; help menu and decision history in the live app.',
        'Accept schedule — sign-off is stored in the browser history; nothing writes to SAP.',
      ],
      tagline:
        'In one line: “What runs next when a rush order or a failed test hits the line — and why?”',
    },
    tourLivePreview: 'Line Scheduler UX preview — same widgets as /demo/plant/ux',
    tourTryUx: 'Open line scheduler',
    tourUiNotes: [
      'Panel: line selector and calm queue summary before any ingest.',
      'Queue: spot near-term finish dates; use filters and row compare in the live app.',
      'Scheduling after rush: proposed order, timeline, copilot summary, and Accept bar.',
      'Queue after QA fail: HOLD row; live ingest uses an open PO on the selected line.',
      'Scheduling: full replan story — open the copilot dock and program timeline toggle.',
      'Accepted plan: decision is recorded under ··· → Decision history (browser only).',
    ],
    tourLinePreviewNote:
      'Scripted snapshot for Line 1. On /demo/plant/ux, Line 2 loads the open queue for LSVLN2.',
    tourInjectNoteRush:
      'Picture after POST /demo/plant/ingest/sap-priority-change. Live call writes the new priority or finish and builds a proposed plan. The screen polls GET queue ~every 5s.',
    tourInjectNoteQa:
      'Picture after POST /demo/plant/ingest/pass-fail-log — HOLD + replan. Demo BFF/MSW example PO 1001884747 (Line 1, Dent).',
    tourSapRefreshHint:
      'Surprise batch: POST /demo/plant/ingest/sap-queue-refresh inserts a new PO and replans that line — map: /demo/how-it-works?section=api&step=03c',
    steps: [
      {
        title: '1. The normal queue',
        plainLine:
          'The scheduler picks a line. Only lines with a demo_line_id are in the list: Line 1 (Line 1 Schedule) and Line 2 (Line 2 Schedule).',
        body:
          'GET /demo/plant/lines/{lineId}/queue reads gold.v_open_queue — active, non-complete orders for that line. The UX route adds panel, queue, and scheduling tabs.',
        highlight: 'Live: /demo/plant/ux · Map: /demo/how-it-works?section=api&step=01',
      },
      {
        title: '2. A job that cannot wait much longer',
        plainLine: 'One order has a due date soon — if it keeps falling down the list, a grower may not get seed on time.',
        body:
          'The app highlights batches tied to near-term commitments. In UX, use queue filters (At risk, species) and compare two POs from the ··· menu.',
        highlight: 'Example: sweet-corn finish 2026-07-06 · Map: /demo/how-it-works?section=api&step=02',
      },
      {
        title: '3. Rush — priority on an existing PO',
        plainLine:
          'An operator posts a priority or finish change for a lot already on the line. The scheduler UI has no rush button.',
        body:
          'The live call writes that change and builds a proposed plan. The preview jumps to Scheduling with the Accept bar — same as polling GET queue after ingest.',
        highlight: 'UI ↔ API: /demo/how-it-works?section=api&step=03 · COISPI refresh: step=03c',
      },
      {
        title: '4. QA fail — pass/fail log',
        plainLine:
          'A Fail row on a lot already in process — PO, line (Equipment ID), and reason (Dent, Discolored, …) — puts that batch on hold and re-sequences the line.',
        body:
          'The live call stores the test and builds a proposed plan. Preview shows HOLD in Queue, then Scheduling with copilot copy. Example PO 1001884747 on Line 1 (see flow step 03b).',
        highlight: 'Map: /demo/how-it-works?section=api&step=03b',
      },
      {
        title: '5. Scheduling + copilot',
        plainLine: 'After a replan, the scheduler sees the proposed order, a reason on each batch, and the simulated copilot summary.',
        body:
          'GET queue returns the proposed plan while it waits for acceptance. UX shows the Gantt, copilot dock, and help journeys — BFF supplies the summary, not a live agent call from the browser.',
        highlight: '/demo/how-it-works?section=api&step=04 · Live scheduling: /demo/plant/ux?section=scheduling',
      },
      {
        title: '6. You sign off',
        plainLine: 'Accept schedule records the human sign-off on the proposed plan — no SAP write.',
        body:
          'Accept records the human decision in the BFF and adds a row to Decision history (local browser). It does not write back to SAP.',
        highlight: 'Try Accept on /demo/plant/ux · curl examples under How it works → UI and API',
      },
    ],
  },
  plantFlowGallery: {
    eyebrow: 'UC1 integration map',
    title: 'UI controls ↔ BFF ↔ JSON (live components)',
    subtitle:
      'Each step starts with the call: method, path, the example request, and the JSON that comes back. The screen preview sits under that contract. While a plan is PROPOSED, GET queue returns that plan and the copilot summary; otherwise it reads gold.v_open_queue.',
    requestHeading: 'Request',
    responseHeading: 'Response',
    noBody: 'No request body. Use line-1 or line-2 in the path. locale is en or es.',
    componentNote:
      'Preview snapshot: plantDemoServer. Live /demo/plant/ux: GET queue returns the proposed plan while it is PROPOSED, otherwise gold.v_open_queue.',
    previewHeading: 'UI preview',
    previewNote:
      'On /demo/plant/ux the line control calls GET /demo/plant/lines/{lineId}/queue (line-1 or line-2). While a plan is PROPOSED the BFF returns that plan and the copilot summary; otherwise it reads gold.v_open_queue.',
    stepNavLabel: 'Flow steps',
    prev: 'Previous',
    next: 'Next',
    backendOwnersLabel: 'Likely backend owners (hackathon)',
    backendOwners: {
      s01: 'Mauricio · BFF GET /demo/plant/lines/{lineId}/queue. This sample is the calm open queue (gold.v_open_queue; lastEvent and pendingExplanation are null). While a plan is PROPOSED the same GET returns that order, its reasons, and the copilot summary — see step 05.',
      s02: 'Same as step 01 — no extra service; Camilo · Data API (queue fields).',
      s03:
        'Mauricio · BFF POST /demo/plant/ingest/sap-priority-change calls gold.ingest_sap_priority_change: priority or finish on an existing PO, then a proposed plan.',
      s03c:
        'Mauricio · BFF POST /demo/plant/ingest/sap-queue-refresh inserts the new PO on the line and calls gold.replan (event queue_refresh).',
      s03b:
        'Mauricio · BFF POST /demo/plant/ingest/pass-fail-log calls gold.ingest_pass_fail: Fail row in silver.quality_test, then a proposed plan with that batch on hold.',
      s04: 'David · POST /explain-replan. The browser never calls it. The BFF sends this body after each ingest. While AGENT_API_BASE_URL is empty, a template inside the BFF writes the text. Set that base URL (no trailing slash) and redeploy core-api to use his service. He returns only alertBanner, summary, bullets, and impact. The BFF stores that on the ingest explanation and on GET pendingExplanation while the plan is PROPOSED.',
      s05: 'Mauricio · BFF GET /demo/plant/lines/{lineId}/queue while the plan is PROPOSED. Same route as step 01. The sample is the poll body: lastEvent, pendingDiff, pendingExplanation — not the ingest POST body.',
      s06: 'Mauricio · BFF POST /demo/plant/schedule/accept calls gold.accept_plan: plan_decision ACCEPT and schedule_plan → ACCEPTED. No SAP write.',
      s07:
        'Mauricio · BFF POST /demo/plant/batches/explain. The panel shows the browser body. The BFF calls David POST /batches/explain with po, question, locale, lineId, and planVersion. He returns po, answer, citations, and suggestedFollowUps. Simulated inside the BFF until AGENT_API_BASE_URL is set.',
    },
    triggers: {
      s01: 'User opens /demo/plant/ux and picks a line — plantDemoApi.getQueue(lineId).',
      s02: 'Same GET response — UI reads finish, atRisk, reasonShort (no second request).',
      s03: 'Operator posts SAP priority change — POST /demo/plant/ingest/sap-priority-change.',
      s03c: 'Operator posts a new COISPI PO — POST /demo/plant/ingest/sap-queue-refresh (insert + replan).',
      s03b:
        'Operator posts a Fail row — POST /demo/plant/ingest/pass-fail-log (example PO 1001884747 on Line 1, Equipment ID, failedFor).',
      s04: 'Private call after each ingest. This sample is the rush plan from step 03. queueSnapshot is that response queue, renamed. A new COISPI PO is eventType rush with the PO in diff.added. A Fail is eventType qa_fail with the PO in diff.held.',
      s05: 'Screen polls GET queue. While PROPOSED the response carries the proposed order, pendingDiff, and pendingExplanation.',
      s06: 'User clicks Accept schedule — POST /demo/plant/schedule/accept.',
      s07: 'Sales asks about one batch — POST /demo/plant/batches/explain.',
    },
    slideTitles: {
      s01: 'Queue table — page load',
      s02: 'Scheduled finish & at-risk rows',
      s03: 'SAP priority ingest',
      s03c: 'SAP queue refresh (surprise PO)',
      s03b: 'Pass/fail log ingest',
      s04: 'AI Copilot — what changed',
      s05: 'Schedule timeline / Gantt',
      s06: 'Accept schedule',
      s07: 'Explain my batch (sales)',
    },
  },
  plantMvp: {
    eyebrow: 'Syngenta UC1 · Hackathon demo target',
    title: 'Pasco conditioning',
    subtitle:
      'A rush order or a failed quality check reorders the line. Look at each batch and why it moved, then accept the plan if you agree. Nothing is sent to SAP.',
    demoTargetBadge: '',
    links: {
      tour: 'Guided story (6 steps)',
      tourCta: 'Start with the 6-step story',
      architecture: 'Integration architecture',
      flowSlides: 'UI ↔ API flow (live map)',
      backMvp: 'Back to Line 1 demo',
      backScheduler: 'Back to scheduler workspace',
    },
    lineScheduleHeading: 'Line Schedule',
    lineSelectLabel: 'Conditioning line',
    lineNames: {
      'line-1': 'Line 1',
      'line-2': 'Line 2',
    },
    lineLoadError: 'Could not load this line.',
    lineQueueHeading: '{line} queue',
    lineTitle: 'Line 1 queue',
    lineSubtitle: 'Calm baseline — replans appear when Data API or BFF ingest receives new source rows (poll every ~5s).',
    loading: 'Loading queue…',
    status: { calm: 'Calm & stable', eventActive: 'Event active — review proposed plan' },
    statusLabels: {
      planned: 'PLANNED',
      atRisk: 'AT RISK',
      complete: 'COMPLETE',
      hold: 'QA HOLD',
      pending: 'PENDING',
      pendingReason: 'Waiting for a plan',
    },
    queueTitle: 'Conditioning run order',
    table: {
      position: 'Schedule line',
      po: 'PO',
      species: 'Species',
      kg: 'Kg',
      finish: 'Scheduled finish',
      status: 'Status',
      reason: 'Reason (position)',
      rushPriority: 'Priority rush',
      rushNote: 'Note rush',
    },
    scheduleShell: {
      brandLine: 'GreenByte',
      facilityLine: 'Pasco Conditioning — Line 1',
      dateRange: 'Jun 29 – Jul 6, 2026',
      clockLabel: '10:42 AM PDT',
      notificationsAria: 'Notifications',
      ganttTitle: 'Program timeline',
      ganttHint: 'Top to bottom is queue order. Each bar runs from the planned start to the planned finish.',
      batchCol: 'Batch / operation',
      species: 'Species',
      client: 'Customer',
      priority: 'Priority',
      urgent: 'URGENT',
      zoom1h: '1H',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      zoomHint: 'Time scale. Zoom in to hours, zoom out to days or a week.',
      dayHeaders: ['Mon 29', 'Tue 30', 'Wed 1', 'Thu 2', 'Fri 3', 'Sat 4', 'Sun 5'],
      hourTicks: ['00:00', '06:00', '12:00', '18:00', '00:00', '06:00', '00:00'],
      footerTotal: '{count} batches · Total runtime: {runtime}',
      demoRuntime: '5d 2h 45m',
      adjustManually: 'Adjust manually',
      adjustHint: 'Drag a batch to another place. The one already running stays first. Batches on hold stay on hold.',
      adjustDrag: 'Drag to reorder',
      adjustDone: 'Done',
      adjustUp: 'Move up',
      adjustDown: 'Move down',
      adjustRunning: 'Running',
      thisOrder: 'This order',
      selectOrderPlaceholder: 'Select an order',
      selectRowHint: 'Select an order on the timeline, then ask about it here.',
      hideCopilot: 'Hide copilot',
      showCopilot: 'Show copilot',
      layoutVertical: 'Vertical',
      layoutHorizontal: 'Horizontal',
      layoutApproval: 'Approval',
      approvalSubtitle: 'Simplified view for approval (not ERP)',
      holdArea: 'Hold area',
      movedUpShort: 'Moved up',
      legendMovedUp: 'Moved up',
      legendHold: 'On hold',
      legendUnchanged: 'Unchanged',
      layoutToggleAria: 'Timeline layout',
      holdShort: 'On hold',
      movedUp: 'Moved up · Was position {n}',
      movedDown: 'Moved down · Was position {n}',
      heldWas: 'On hold · Was position {n}',
      ganttScrollHint: 'Scroll to see all batches on the timeline.',
      ganttIdleGap: 'No runs planned for {d}',
      ganttScrollRegionVertical: 'Program timeline, vertical layout',
      ganttScrollRegionHorizontal: 'Program timeline, horizontal card strip',
      expand: 'Expand timeline',
      closeExpanded: 'Close expanded timeline',
      expandedBackdropLocked: 'Review the proposed plan in Scheduling before closing',
      queuePosition: 'Queue position {n}',
    },
    pagination: {
      rowsPerPage: 'Rows per page',
      showing: 'Showing {from}–{to} of {total}',
      prev: 'Previous',
      next: 'Next',
      pageOf: 'Page {page} of {totalPages}',
    },
    baselineDashboard: {
      nav: {
        panel: 'Dashboard',
        queue: 'Queue',
        scheduling: 'Scheduling',
        copilot: 'AI Copilot',
      },
      lastUpdated: 'Last updated: Just now',
      pageTitle: 'Pasco Conditioning — Line 1',
      moodLine: 'Calm · No pending replan',
      queueTitle: 'Line 1 queue',
      orderCount: '{n} orders',
      queueSubtitle: 'Active queue · Finish dates and priorities for open batches',
      queueSubtitleEvent: 'Queue replanned — review program timeline and copilot below',
      moodLineEvent: 'Event active · Proposed schedule on timeline',
      summaryHeadlineEvent: 'Replanned',
      summaryBulletsEvent: 'Review moves on the timeline · Accept to log (no ERP write)',
      sortFilter: 'Sort / Filter',
      colPo: 'PO no.',
      colSpecies: 'Species',
      actionsAria: 'Row actions',
      finishFormat: '{date} at {time}',
      summaryTitle: 'Line overview',
      summaryHeadline: 'Calm & stable',
      summaryBullets: 'No pending replan · Queue matches the accepted plan',
      metricLoad: 'Queue load',
      metricNextFinish: 'Next finish',
      metricUtilization: 'Line utilization',
      copilotReady: 'AI Copilot ready',
      sectionDashboard: 'Line overview',
      sectionQueue: 'Line 1 queue',
      sectionScheduling: 'Program timeline',
      sectionCopilot: 'AI Copilot — What changed',
      eventBannerHint: 'Open the Scheduling tab to review the replan and accept.',
      navBadgeScheduling: 'Pending event — review and accept',
      navBadgeQueue: 'Queue updated after accept',
      notificationsBellAria: 'Notifications, {n} unread',
      notificationsEmpty: 'No new notifications',
      notificationSchedulingTitle: 'Scheduling needs review',
      notificationSchedulingBody: 'Rush or QA replan waiting for accept',
      notificationQueueTitle: 'Queue updated',
      notificationQueueBody: 'Accepted plan — check new order and dates',
    },
    dataFeed: {
      title: 'Events come from data — not from this screen',
      body: 'Syngenta UC1: rush and QA replans trigger when SAP schedule data or LSV pass/fail rows update. Operators or Data API POST to BFF ingest; this UI polls the queue and shows notifications when a replan is pending.',
      sapPath: 'POST /demo/plant/ingest/sap-priority-change',
      sapRefreshPath: 'POST /demo/plant/ingest/sap-queue-refresh',
      passFailPath: 'POST /demo/plant/ingest/pass-fail-log',
      operatorDocLead: 'curl examples are on the documentation page:',
    },
    actions: {
      accept: 'Accept schedule',
      accepted: 'Accepted',
      resetDemo: 'Reset demo',
      resettingDemo: 'Resetting…',
      resetDemoHint: 'Clears the plan, rush marks, QA fails posted in this demo, and copilot chats. Every order stays pending until you generate a plan.',
      generatePlan: 'Generate plan',
      generatingPlan: 'Generating…',
      generatePlanHint: 'Runs the scheduler on the orders already on this line.',
      demoActionError: 'That did not finish. Try again.',
      planModalTitle: 'Generating the plan',
      planModalSubtitle: 'The queue updates when this finishes. Nothing is written to SAP.',
      planModalSteps: [
        'Reading the orders already on this line',
        'Reading notes for rush, hold, and not ready',
        'Ordering the line. The batch already running stays first',
        'Fitting changeovers between species',
        'Writing a reason on every order',
      ],
    },
    copilotTitle: 'AI Copilot — What changed',
    copilotIdle:
      'A rush order or a failed quality check reorders the line. Open Scheduling to review moves and the copilot summary, then accept if you agree. Nothing is sent to SAP.',
    copilotIdleHere: 'No schedule change is waiting.',
    footerStats: '{count} active batches in queue (Pasco-style POs).',
    acceptedNote: 'Human acceptance recorded on the proposed plan. No write to SAP.',
    uxCompare: {
      previewLink: 'Open line scheduler',
      signedInAs: 'Signed in as {user}',
      signOut: 'Sign out',
    },
    uxLogin: {
      eyebrow: 'Demo access',
      title: 'Sign in to Pasco line scheduler',
      subtitle: 'Hackathon demo gate — use the shared scheduler account.',
      usernameLabel: 'Username',
      passwordLabel: 'Password',
      submit: 'Continue',
      error: 'Invalid username or password.',
      hint: 'Default demo user is\ngreenbyte_user\ngr33nb4t3',
    },
    ux: {
      navHelp: 'Help',
      pillSmooth: 'Running smoothly',
      pillSmoothSub: 'No pending schedule change',
      pillAction: 'Action required',
      pillActionSub: 'A schedule update needs your approval',
      pillApproved: 'Plan approved',
      pillApprovedSub: 'Please confirm the queue order',
      calmTitle: 'Calm and stable',
      calmBody: 'No schedule changes waiting · {line} is on plan',
      calmMeta: 'Next completion: {finish} · Line utilization {utilization}%',
      amberTitle: 'Schedule change waiting for your approval',
      amberBody:
        'Review the **timeline** and **copilot summary**, then **Accept schedule** if you agree. **Nothing is sent to SAP** automatically.',
      planReviewModal: {
        title: 'Proposed plan ready',
        eventRush: 'Priority replan',
        eventQa: 'Quality hold replan',
        lead: 'A new **proposed plan** was generated for **{line}**.',
        bullets: [
          'Open **Scheduling** to review the **timeline**, queue moves, and **copilot** explanation.',
          'Tap **Accept schedule** only after you agree — **no SAP write** in this demo.',
        ],
        hint: 'This notice stays on screen until you open Scheduling to review the plan.',
        cta: 'Review in Scheduling',
      },
      approvedStrip: 'Approved · Demo audit only — no live ERP write',
      whereNext: 'Where to go next',
      nextCalm: 'Use Queue for batch order and finish dates. Scheduling shows the timeline when a replan is pending.',
      nextApproved: 'Open the Queue to confirm the new order.',
      notifTitle: 'Notifications',
      notifEmptySub: 'You’re caught up on {line}',
      reviewUpdated: 'Review updated schedule',
      pBell: 'Priority change — customer window',
      qBell: 'Quality failure — batch on hold',
      openSchedule: 'Open Schedule',
      dismiss: 'Dismiss',
      askBtn: 'Ask about an order…',
      helpTitle: 'Help',
      helpClose: 'Close',
      helpIntroTitle: 'Pasco conditioning',
      helpIntroBody:
        'A rush order or a failed quality check reorders the line. Look at each batch and why it moved, then accept the plan if you agree. Nothing is sent to SAP.',
      glossaryTitle: 'Glossary',
      journeysTitle: 'Typical flows',
      timelineTitle: 'Reading the timeline',
      timelineLegend: [
        { tone: 'up' as const, label: 'Moved up in the queue' },
        { tone: 'rush' as const, label: 'Rush order' },
        { tone: 'hold' as const, label: 'On hold' },
        { tone: 'quiet' as const, label: 'Unchanged' },
      ],
      timelineRules: [
        'The batch already running stays first.',
        'Batches on hold stay on hold.',
        'Approval is for review only. Drag a batch in Vertical or Horizontal.',
        'Select an order on the timeline. Ask about it from the chat button in the corner.',
        'Hide the copilot when you want the schedule wider. It opens again when a new change arrives.',
      ],
      glossary: [
        { term: 'PO (order)', def: 'One batch of seed with its own order number.' },
        { term: 'Hold', def: 'A batch set aside after a failed quality check.' },
        { term: 'Approve', def: 'You agree with the proposed order; recorded in the demo only.' },
        { term: 'ERP note', def: 'Approving here does not change SAP/ERP automatically.' },
      ],
      journeys: [
        {
          title: 'Morning check',
          steps: [
            'Open Dashboard and check green status',
            'Review KPIs, then open Queue for finish dates',
            'Optional: open Scheduling for the week',
          ],
        },
        {
          title: 'Priority or quality event',
          steps: [
            'Bell shows 1 — open notifications',
            'Open Scheduling and read the copilot beside the timeline',
            'Approve schedule, then open Queue to confirm order',
          ],
        },
      ],
      whatChanged: 'What changed',
      queueSubAfter: 'Queue reflects your approved plan — verify order and dates',
      filterLabel: 'Filter queue',
      fAll: 'All orders',
      fRisk: 'At risk',
      fHold: 'On hold',
      fSwco: 'SWCO only',
      fCorn: 'CORN only',
      clearFilter: 'Show all',
      noRows: 'No orders match this filter.',
      confirmTitle: 'Confirm queue order',
      confirmBody: 'You approved the plan — check positions and finish dates',
      openQueue: 'Open Queue',
      menuHistory: 'Decision history',
      historyTitle: 'Decision history',
      historySub:
        'Saved in this browser until you clear site data. Nothing is sent to ERP or SAP.',
      historyEmpty: 'No decisions yet. Approvals will appear here.',
      histPriority: 'Approved priority update — order {po} replanned',
      histQuality: 'Approved quality hold — order {po} on hold',
      histMeta: '{line} · {when}',
      histTodayAt: 'Today · {t}',
      histYesterdayAt: 'Yesterday · {t}',
      histOnDate: '{date} · {t}',
      selectAll: 'Select all visible orders',
      selectRow: 'Select order {po}',
      nSelected: '{n} selected',
      compare: 'Compare selected',
      clearSel: 'Clear',
      cmpTitle: 'Compare orders',
      cmpSub: 'Side by side using current Line 1 data. The queue does not change.',
      cmpTotal: 'Total weight',
      cmpCrops: 'Crops',
      cmpFirst: 'First to finish',
      cmpLast: 'Last to finish',
      cmpHolds: '{n} on hold — no ship date',
      cmpPosition: 'Position',
      colOrder: 'Order',
      colWeight: 'Weight',
      colFinish: 'Planned finish',
      colStatus: 'Status',
      paused: 'No ship date',
    },
    salesChat: {
      eyebrow: 'When a customer asks about a batch',
      title: 'Explain my batch (sales / customer service)',
      subtitle:
        'Ask why a PO is waiting, when it ships, or what would move it up — answers grounded in the current Line 1 queue (Agent API when live).',
      poLabel: 'Production order (PO)',
      quickPrompts: ['Why is it waiting?', 'When does it ship?', 'What would move it up?', 'Rush this order', 'This order failed'],
      inputPlaceholder: 'Ask about this batch…',
      askButton: 'Ask',
      railPrompt: 'Ask about this order, or tell the copilot to rush it. A rush proposes a new plan and still waits for you to accept it.',
      rushError: 'The rush was not sent. Ask again in a moment.',
      failError: 'The fail was not recorded. Ask again in a moment.',
      noteOpen: 'Ask the copilot about this order',
      noteClose: 'Close note',
      noteEmpty: 'No notes on this order yet. Write one and the copilot answers here.',
      notePlaceholder: 'Note for this order…',
      noteSend: 'Send',
      noteSending: 'Sending…',
      youLabel: 'You',
      copilotLabel: 'Copilot',
      thinking: 'Looking up this order…',
      replanning: 'Replanning the line for this rush. This order stays put until the new plan is ready.',
      holding: 'Recording the fail and putting this order on hold. It stays put until the new plan is ready.',
      askError: 'The answer did not come back. Ask again in a moment.',
      citationsLabel: 'Sources',
    },
  },
  demoArchitecture: {
    eyebrow: 'Syngenta hackathon · Technical baseline',
    title: 'Demo architecture',
    subtitle:
      'The demo that runs is UC1. React calls only the BFF. The BFF reads and writes PostgreSQL. The agent narrates the plan the rules already built.',
    docNote: 'Document version 1.4 · No live Syngenta production connections.',
    useCasesTitle: 'Syngenta briefs',
    genAiRoleLabel: 'GenAI role',
    useCaseCards: [
      {
        id: 'UC1',
        name: 'Plant Capacity Utilization (Pasco)',
        problem:
          'Conditioning lines juggle many batches; rush orders and QA failures force manual replanning without clear explanations.',
        genAiRole:
          'PostgreSQL reorders the line and writes a reason on each position. The agent only narrates that plan. A person accepts. Nothing is written to SAP.',
      },
    ],
    fieldLabels: {
      syngentaGoal: 'Syngenta success criteria (demo)',
      data: 'Hackathon data (repo)',
      demoRoute: 'GreenByte walkthrough',
    },
    groups: {
      shared: {
        title: 'What this demo runs',
        intro:
          'One path. The browser never calls the database or the agent. Camilo’s Data API and David’s Agent API are separate services. While their base URLs are empty, the BFF runs the SQL and a text template itself.',
      },
      uc1: {
        title: 'UC1 — Plant capacity',
        intro:
          'Two operator paths: curl or scripts post SAP, COISPI, or Fail ingests; on /demo/plant/ux the scheduler uses Reset demo (stage-raw) and Generate plan (plan-line). PostgreSQL reorders the line. The agent explains the diff when a plan is proposed. Accept does not write to SAP.',
        syngentaGoal: 'The rules propose the order and the reason. A person validates. No live SAP connection.',
        dataSource:
          'Pasco LSV/SSV conditioning Excel (schedules, SAP orders, conditioning logs, pass/fail logs), loaded into PostgreSQL.',
      },
    },
    teamTitle: 'Team responsibilities',
    teamIntro:
      'Three owners. The path that runs is the BFF plus PostgreSQL. Camilo and David plug in when their base URLs are set on core-api.',
    teamTable: {
      role: 'Role',
      owner: 'Owner',
      responsibility: 'Responsibility',
      useCases: 'What they own here',
    },
    teamRows: [
      {
        role: 'Product UI + BFF',
        owner: 'Mauricio / GreenByte',
        responsibility: 'One contract for the browser. The BFF calls PostgreSQL and, after a replan, the agent.',
        useCases:
          'GET /demo/plant/lines/{lineId}/queue · POST /demo/stage-raw · POST /demo/plan-line · POST ingest (priority, COISPI refresh, pass/fail) · POST /schedule/accept · POST /batches/explain',
      },
      {
        role: 'Data in PostgreSQL',
        owner: 'Camilo',
        responsibility:
          'ETL, schema, and data quality. His HTTP Data API is the handoff when DATA_API_BASE_URL is set. This demo does not call it while that URL is empty.',
        useCases: 'gold.replan writes the order. gold.accept_plan records the human decision. Not a browser route.',
      },
      {
        role: 'Agent API',
        owner: 'David',
        responsibility:
          'Narrate the plan. He does not reorder the line and he does not read the database. The BFF sends the diff and queueSnapshot.',
        useCases:
          'POST /explain-replan · POST /batches/explain. A template inside the BFF until AGENT_API_BASE_URL is set.',
      },
    ],
    endpointsTitle: 'UC1 contracts',
    endpointTable: {
      layer: 'Layer',
      examples: 'Examples',
      purpose: 'Purpose in this use case',
    },
    uc1Endpoints: [
      {
        layer: 'BFF',
        examples:
          'GET .../queue · POST .../demo/stage-raw · POST .../demo/plan-line · POST .../ingest/* · POST .../schedule/accept · POST .../batches/explain',
        purpose:
          'UX reset and one-shot plan, scripted ingest, queue poll, human accept, and sales Q&A. stage-raw clears plans and demo rush/QA ingests; plan-line runs gold.replan on the line.',
      },
      {
        layer: 'PostgreSQL',
        examples: 'gold.replan · gold.accept_plan · gold.v_open_queue',
        purpose: 'Rules write the order and a reason per position. Accept stores the decision. No SAP write.',
      },
      {
        layer: 'Agent API',
        examples: 'POST /explain-replan · POST /batches/explain',
        purpose: 'Plain-language summary of a plan the rules already computed. Sales Q&A is read-only.',
      },
    ],
    rulesTitle: 'How the pieces fit',
    rules: [
      'The browser calls only /demo/plant/*.',
      'Order and reasons come from gold.replan. The agent does not rank the line.',
      'The agent receives the diff and queueSnapshot. queueSnapshot is the plan queue, renamed. It must not invent orders or dates.',
      'An empty AGENT_API_BASE_URL keeps the template inside the BFF. If the agent call fails, the plan still returns.',
      'Accept records the human decision. It does not write to SAP.',
      'POST /demo/plant/demo/stage-raw returns the raw open queue for one line (no plan). POST /demo/plant/demo/plan-line runs one replan; the UX polls GET queue when it finishes.',
    ],
    diagrams: {
      shared: `React  /demo/plant
        |
        |  only this hop
        v
core-api  BFF
        |
        +-- PostgreSQL
        |     gold.replan        order + reason per position
        |     gold.accept_plan   human sign-off, no SAP write
        |
        +-- Agent
              POST /explain-replan     diff + queueSnapshot
              POST /batches/explain    sales question, read-only
              template inside the BFF while AGENT_API_BASE_URL is empty`,
      uc1Flow: `Pasco Excel -- ETL --> PostgreSQL

Operator (scripts / curl)
  POST /demo/plant/ingest/sap-priority-change
  POST /demo/plant/ingest/sap-queue-refresh
  POST /demo/plant/ingest/pass-fail-log
        |
        v
core-api BFF -- gold.replan --> proposed plan
        |
        +-- POST /explain-replan --> copilot text
                    queueSnapshot = the plan queue

Scheduler UX  (/demo/plant/ux)
  POST /demo/plant/demo/stage-raw   --> raw open queue (plans cleared)
  POST /demo/plant/demo/plan-line   --> one gold.replan on the line

React polls GET /demo/plant/lines/{lineId}/queue
Scheduler POST /demo/plant/schedule/accept --> gold.accept_plan`,
      uc1Sequence: `Ingest path
Operator     React          BFF            PostgreSQL       Agent
   |           |              |                 |              |
   |-- ingest --------------->|                 |              |
   |           |              |-- gold.replan ->|              |
   |           |              |<- queue + diff -|              |
   |           |              |-- explain-replan ------------->|
   |           |              |<- summary ---------------------|
   |           |-- GET queue ->|                 |              |
   |           |<- plan + why -|                 |              |
   |           |-- accept ---->|-- accept_plan ->|              |

UX toolbar (/demo/plant/ux)
   |           |              |                 |              |
   |           |-- stage-raw >| clear plans ---->|              |
   |           |<- raw queue -|                 |              |
   |           |-- plan-line >|-- gold.replan -->|              |
   |           |              |-- explain-replan (if needed) ->|
   |           |-- GET queue >|                 |              |
   |           |<- plan + why -|                 |              |
   |           |-- accept ---->|-- accept_plan ->|              |`,
    },
    sections: {
      container: {
        title: 'Runtime path',
        description: 'The browser stops at the BFF. Rules live in PostgreSQL. The agent only receives the plan.',
      },
      teamStack: {
        title: 'Team stack',
        description: 'Shown in the table above.',
      },
      uc1Flow: {
        title: 'UC1 — From ingest to accept',
        description:
          'SAP and QA events use operator ingest. The scheduler UX also calls stage-raw and plan-line from Reset demo and Generate plan. The screen polls the queue.',
      },
      uc1Sequence: {
        title: 'UC1 — Call order',
        description: 'Replan finishes before explain. Accept does not call the agent. The UX path clears the line before an optional manual replan.',
      },
    },
    monolithTitle: 'What is actually deployed',
    monolithBody:
      'This demo deploys the React app, core-api, and PostgreSQL. The Data API and the Agent API are contracts. They stay inside the BFF until Camilo and David publish base URLs.',
  },

  lang: {
    switchLabel: 'Language',
    en: 'EN',
    es: 'ES',
  },
  hero: {
    eyebrow: 'AgTech · Generative AI',
    title: 'The technologies tackling heat and drought',
    subtitle:
      'How can farmers protect their crops during soaring temperatures? GreenByte explores data-driven and AI-assisted answers — in partnership with Syngenta for the hackathon.',
    ctaDiscover: 'Discover GreenByte',
    ctaPrecision: 'Precision agriculture',
    ctaDemoPlant: 'Pasco line scheduler',
    ctaArchitecture: 'Architecture',
  },
  intro: {
    title: 'GreenByte',
    body: 'We deliver breakthroughs for farmers, in every field so they can meet the demands of modern agriculture. Through cutting-edge innovation — including generative AI — we help farmers grow resilient, healthy crops that can feed an increasing global population, while producing food in a way that helps improve our planet.',
  },
  discover: {
    title: 'Discover GreenByte',
    readMore: 'Read more',
    cards: [
      {
        title: 'How AI helps predict hybrid performance before planting',
        tag: 'Innovation',
      },
      {
        title: 'Predicting solutions for herbicide resistance',
        tag: 'Research',
      },
      {
        title: 'Top weeds impacting global food security',
        tag: 'Insights',
      },
      {
        title: 'Can biologicals reduce fertilizer dependency?',
        tag: 'Sustainability',
      },
      {
        title: 'Trialing the traits of tomorrow',
        tag: 'Seeds & traits',
      },
      {
        title: 'Inside the lab solving agriculture’s next problem',
        tag: 'Science',
      },
    ],
  },
  precision: {
    title: 'What is precision agriculture?',
    body1:
      'It is a farming approach that uses technology to monitor and manage field variability in crops.',
    body2:
      'Learn how it helps make agriculture more efficient, productive and sustainable — with GreenByte as the platform we are building during the hackathon.',
    learnMore: 'Learn more →',
    mapLabel: 'Field variability map',
  },
  news: {
    title: 'Media releases',
    items: [
      {
        date: 'Sep 2026',
        title: 'GreenByte launches AgTech hackathon collaboration with Syngenta',
      },
      {
        date: 'Sep 2026',
        title: 'Precision agriculture platform preview at greenbyte-ag.com',
      },
      {
        date: 'Coming soon',
        title: 'Generative AI assistant for field-level recommendations',
      },
    ],
  },
  sustainability: {
    title: 'Our sustainability priorities',
    body: 'Working with farmers, we believe agriculture can become a climate solution, regenerating soil and nature, while feeding the world. Our priorities set clear targets to reduce our environmental footprint.',
    cta: 'Explore priorities',
  },
  footer: {
    blurb:
      'Breakthroughs for farmers, in every field — powered by data and generative AI. Hackathon project in collaboration with Syngenta.',
    explore: 'Explore',
    about: 'About GreenByte',
    sustainability: 'Sustainability',
    contact: 'Contact',
    prioritiesTitle: 'Our priorities',
    prioritiesBody:
      'Regenerative agriculture, soil health, and resilient crops that feed a growing world — with a reduced environmental footprint.',
    copyright: 'GreenByte. Independent hackathon project.',
    disclaimer: 'Not affiliated with or endorsed by Syngenta. Industry partner for the hackathon.',
  },
};

export type Messages = typeof en;
