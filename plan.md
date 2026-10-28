# AIRSHELL / SYCORD — PRODUCT, DESIGN & ENGINEERING MASTER PLAN

> Version 1.0 · 2026-10-28 · Status: **PROPOSED ROADMAP** (not implemented)  
> Repository: MDavidka/Sycord-cloud · Platforms: responsive web, installable iPhone PWA, Expo WebView, native SwiftUI  
> Goal: a calm, premium, trustworthy private AI-and-server workspace that feels native to iOS while remaining useful on desktop.

## 0. Reading this plan

- **EXISTING:** confirmed in project source or documented in the repository; deployment still needs verification.
- **PARTIAL:** an implementation exists but lacks some production behavior.
- **PROPOSED:** new functionality or UX change; do not claim it exists.
- **RESEARCH:** feasibility, provider support, security or cost must be established.
- **P0:** safety/correctness/security/unstable foundations. **P1:** core UX and reliability. **P2:** differentiation. **P3:** experiments.
- Effort estimates: **S** 0.5–2 dev days; **M** 3–7; **L** 1–3 weeks; **XL** multiple sprints. Estimates are relative, not promises.
- Definition of done includes automated tests, responsive screenshots, accessibility, error handling, and real iPhone validation.

### Product promise

**Airshell is a private control room for your authorized Linux servers: inspect, ask, approve, operate and verify—from an iPhone.** It should combine an excellent AI chat experience, a reliable terminal, contextual file tools, honest health information, and safe guided server operations.

### Core principles

1. **Clarity beats decoration.** Neutral colors, excellent hierarchy and restrained components; no random shadows, glow, tinted gradients, fake UI or AI-slop.
2. **Trust is a first-class feature.** No execution without appropriate scoping and approval; always show real backend evidence.
3. **Mobile-first does not mean mobile-only.** Adaptive 320px–large desktop layout; advanced desktop features progressively revealed.
4. **Server context stays visible.** Every command, file edit, diagnostic and AI response has a known target.
5. **One design language.** Web, Expo and SwiftUI share tokens, interaction principles and UX vocabulary.
6. **Data is private.** Never expose credentials in logs, URLs, chat transcripts or cached pages.
7. **Actionable states.** Connected, disconnected, stale, processing, awaiting approval, failed and successful must be truthful and distinct.
8. **Performance is design.** Fast input, stable scroll, no animated terminal output, predictable updates.
9. **No dead ends.** Every error provides a clear fix or retry action.
10. **Build incrementally.** Do not introduce new architecture without tests or break working SSH sessions.

## 1. Current repository and functional baseline

### 1.1 What is already present

| Area | Current capability | Key paths |
| --- | --- | --- |
| Web app | password sign-in, dashboard/chat, terminal, settings | views/dashboard.html, views/terminal.html, server.js |
| SSH | saved SSH hosts, keys/passwords, Instabox, connection tests | server.js, public/home.js |
| Temporary support | time-limited Supporter VM flow, distinct from ordinary server UI | connection_guide.md, API_SUPPORTERS.md |
| Terminal | xterm.js, WebSocket, SSH, optional remote tmux reattachment | public/terminal.js, server.js |
| Files | remote directory listing and text previews | public/terminal.js and file APIs |
| Diagnostics | CPU, RAM, disk, network, uptime, host/provider labels | VM settings JS/CSS and /api/servers/:id/details |
| AI | NVIDIA NIM-backed chat and tool calling; gated write/move/commands | public/home.js, server.js |
| Persistence | MongoDB workspaces and terminal logs, local fallback | server.js, README.md |
| PWA | installable app and static-asset-only cache | public/sw.js |
| Expo | existing site in native WebView with haptic bridge | mobile/src/app/index.tsx |
| Native iOS | SwiftUI setup/login/chat/servers/files/terminal/profile | ios-native/Sources/Sycord/ |
| Recently refined sidebar | search/compose/account, neutral flat status indicators | public/sidebar-modern.css, public/sidebar-modern.js |

**Important caveats:** README documents one shared terminal password and a remembered session cookie lasting up to ten years; re-evaluate this before broad distribution. Inbox, Roadmap, Research and pinned sample content have appeared as *visual placeholders*; do not present them as shipped functionality. README and Supporter-specific docs may describe different iterations: audit actual routes before making user-facing promises.

### 1.2 Technical debt and product risks

- Multiple CSS layers compete: public/app.css, home-reference.css, override.css, ios-chat-refinement.css and sidebar-modern.css. Eliminate cascade fights and excessive !important, rather than adding more overrides.
- Dashboard and Terminal duplicate their sidebar markup; shared components and behavioral contracts are needed.
- public/home.js and server.js each cover numerous responsibilities; split into testable modules.
- Mobile WebView is not a fully native app; the independent SwiftUI app is a separate implementation that needs parity tracking.
- Cached terminal output and private workspace data require clear persistence/retention/redaction policies.
- Existing session model needs device revocation, expiry, inactivity controls and authentication hardening.
- The supporter flow must never be mistaken for automatic SSH tunneling, remote account revocation or ongoing access without authorization.
- The PWA must not cache authenticated pages, protected APIs, terminal data, file contents or credentials.
- Real iPhone screenshots should gate style changes. Avoid accepting CSS-only visual guesses as verified outcomes.

## 2. Information architecture and navigation

### Primary destinations

| Destination | Purpose | iPhone | iPad/Desktop |
| --- | --- | --- | --- |
| Home / AI | chat, context, recent actions and safe suggestions | narrow chat with compact composer | chat and optional context rail |
| Servers | inventory, grouped health, search, connect | stacked list + detail push | list with inspector |
| Terminal | interactive sessions on selected server | full height, key strip, contextual bar | tabs, panels and shortcuts |
| Files | browse, preview, edit, compare authorized files | list -> preview/diff sheet | list + editor split |
| Activity | jobs, approvals, alerts, auditable events | filterable timeline | timeline/table |
| Automations | watch rules, schedules, executions | rule list + detail sheets | dashboard |
| Settings | account, security, theme, access and devices | sheet -> page | pane/dialog |

Keep terminal and files accessible contextually for a selected server. Hide nonfunctional Inbox, Roadmap and Research actions until there is an actual destination. Keep temporary Supporter VMs in a dedicated temporary-access area, not ordinary server navigation.

### Navigation standards

- On iPhone, use a compact left drawer with scrim dismissal, Escape, focus management and explicit selected state.
- For the native app, follow SwiftUI NavigationStack/adaptive tab conventions; do not copy the web drawer blindly.
- Support reliable back navigation, deep links and browser history for server, terminal, file and settings pages.
- Preserve selected server, current terminal/files tab, file path, chat draft, sidebar scroll and unsent edits.
- Prevent the keyboard from obscuring the composer, confirmation dialogs and destructive controls.
- Show one top-level navigator at a time; no double nav bars, duplicate toolbars or stacked selectors.
- A footer account row remains reachable in all screen heights without covering scrollable links.
- Treat user-initiated closing of a terminal pane separately from ending the remote tmux/session.

### Key user journeys to optimize

1. **First server:** sign in -> choose SSH/Instabox -> validated input -> connection test -> saved server -> useful next action.
2. **Issue triage:** alert -> last valid metric time -> server detail -> diagnosis -> recommended safe action -> approved execution -> verified result.
3. **AI command:** target selection -> explicit plan -> command preview with exact literal args and risk -> user confirmation -> audit receipt -> verify.
4. **File edit:** open -> read -> local draft -> diff -> backup/atomic-save proposal -> approval -> success and recovery reference.
5. **Network failure:** terminal disconnect -> clear reconnect banner -> reattach where supported -> restore visible output marker -> resume.
6. **Temporary support:** explicit authorization -> select main VM -> test connectivity -> verify target credentials -> expiration -> review/revoke.
7. **Native onboarding:** workspace HTTPS URL -> security context -> authenticate -> first server -> first chat/terminal action.

## 3. Visual design system

### 3.1 Style direction

Aim for the *restraint and legibility* of leading modern iOS apps, including ChatGPT, while keeping distinctive Airshell branding. No imitation of proprietary screens or assets. Appearance should be serious, soft, simple and intentional.

**Never add:** blue/purple ambient glows, random green halos, decorative gradient backgrounds, excessive border stacks, fake iOS status indicators, filler cards, giant headings, multiple layers of frosted glass, arbitrary tinted grays, uncontrolled shadows, 24px-only hit areas, or custom typography values with no token.

### 3.2 Semantic tokens

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| canvas | #121212 | #FFFFFF | main background |
| drawer | #171717 | #FAFAFA | navigation |
| surface | #202020 | #F0F0F0 | grouped regions |
| hover | #222222 | #EDEDED | hovered/pressed |
| selected | #262626 | #E8E8E8 | selected nav |
| elevated | #292929 | #F4F4F4 | contextual sheet |
| border | #2D2D2D | #DFDFDF | fine separation |
| primary | #F5F5F5 | #202020 | primary content |
| secondary | #A3A3A3 | #555555 | labels/metadata |
| tertiary | #858585 | #6B6B6B | quiet supporting text |
| online | #2FBD73 | #218A57 | verified success |
| warning | #D5AD63 | #946A26 | degraded |
| error | #DB6A6A | #B94646 | disconnected/danger |
| info | #8FA9C4 | #456D95 | sparing neutral information |

- Connectivity markers: solid 7–8px circles; **box-shadow: none**, no pulse, no outer halo; pair with accessible text and last-checked time.
- All page modules consume semantic CSS custom properties; native SwiftUI uses mapped Color assets/tokens, React Native uses a synchronized theme object.
- Muted neutral palette is the default. Color is for operational meaning, not decoration.
- No global shadow; use surface separation or a quiet border first. Scrims are appropriate only for real overlays.
- System theme must initialize without a wrong-theme flash.

### 3.3 Typography

- Preferred iOS: system/SF Pro via platform API; web: -apple-system, system-ui, Geist fallback. Do not ship Apple font files.
- Hero display: 28–32px / 1.15 / 650. Screen title: 22–24px / 1.25 / 600.
- Section: 17–18px / 1.3 / 600. Body/chat: 15–16px / 1.45–1.6.
- Navigation: 15–16px / 1.3 / 450–550. Secondary: 12–13px; avoid sub-11px functional labels.
- Monospace terminal: 14px default, adjustable 12–18px. Respect xterm character grid.
- Numeric metrics: tabular numbers, consistent units and precision.
- Accommodate Dynamic Type, 200% browser zoom/reflow, VoiceOver, bold text and increased contrast.

### 3.4 Geometry and spacing

| Object | Recommendation |
| --- | --- |
| Space scale | 4, 8, 12, 16, 20, 24, 32, 40px |
| Phone page gutter | 16–20px |
| Header icon glyph | 19–22px, stroke ~1.75 |
| Icon hit target | aim >= 44×44px |
| Nav row | 44–48px high, radius 12px |
| Server row | 54–64px high, 2 text lines max |
| Input field | 48–52px high, radius 14px |
| Small radius | 10px |
| Card radius | 16px |
| Sheet radius | 24–28px |
| Sidebar width | min(318px, viewport width minus 64px) on compact phone |
| Chat max content width | approx. 760–820px |
| Motion | ~150ms feedback, 240–280ms drawer; respect reduce motion |
| Insets | env(safe-area-inset-*), keyboard-aware content, 100dvh |

Test widths 320, 360, 375, 390, 402, 430, 768, 1024 and 1440px; both phone orientations and large text. Use a visible focus ring, accessible labels and sufficient contrast. WCAG 2.2 AA is a floor; design touch affordances generally larger than the bare WCAG 24px minimum.

### 3.5 Concrete sidebar design

- Header: 32px Airshell mark, 19px wordmark, 38–44px Search and New Chat controls.
- Primary: Home, real Activity/Inbox. Selected item gets subtle #262626 background (not a bright glowing pill).
- Servers: plain “Your servers” text with chevron and add; 32px icon, name + flat status dot, secondary host, no default X-delete buttons.
- Workspace: real destinations; no decorative category chips.
- Recents/Pinned: only persistent real items, not placeholder Q4 content.
- Account: quiet compact 54px footer with avatar, name and contextual menu. No fake user identity or oversized panel.
- Drawer: one neutral color, no extra shade at bottom, no gradient mask, no halo and no dramatic edge shadow.
- Search expands/focuses on demand; selection and collapse behave consistently across Home and Terminal.

**Screenshot gate:** 390×844 with 3 similarly named servers, one long hostname and the keyboard closed. The result must be aligned, readable, compact, flat, and easy to touch.

## 4. New UI component library

Build reusable components with clear props, state contracts and preview fixtures; do not create a second monolithic stylesheet.

| Components | Required behavior |
| --- | --- |
| AppShell / AdaptiveSidebar / NavigationRow | responsive screen layout, accessible active state, dismiss and focus |
| SidebarSection / SectionActions / SidebarSearch | disclosure, quick add, filter with empty results |
| ServerRow / ServerIcon / FlatStatusDot | long-name truncation, freshness, context actions |
| ServerGroup / ServerPicker / ServerDetailHeader | environments, favorites, current host |
| ServerQuickActions / ServerMetricTile / MetricChart | contextual operations and sample timestamps |
| ConnectionBanner / ReconnectToast / EmptyState / ErrorState | actionable honesty, retry and diagnostics |
| CommandPalette / KeyboardShortcutSheet | search pages, servers, actions and help |
| ChatMessage / StreamingText / ChatComposer / MessageToolbar | copy, retry, stop, edit, rich safe output |
| AssistantToolStep / ApprovalSheet / ActionReceipt | inspect, propose, approval, execute, verify |
| RiskLabel / CommandDiff / PermissionScope | command target and visible operational effects |
| TerminalViewport / TerminalToolbar / TerminalKeyStrip | reliable input, find, copy, resize, reconnect |
| TerminalSessionTab / SessionOverview | multiple sessions, reattach and close semantics |
| FileBreadcrumb / FileRow / FilePreview / FileDiff | paths, safe text rendering, diff readability |
| EditorSaveReview / VersionHistory | backup and explicit save confirmation |
| AlertRow / IncidentTimeline / EventFilter | timestamps, server identity and severity |
| HealthSummary / MetricThresholdEditor / JobProgress | accurate monitoring and task states |
| AutomationsList / RuleBuilder / RunHistory | schedule, condition, scope, errors and actions |
| ServerWizard / CredentialField / ConnectionDiagnosis | validation, secure input and troubleshooting |
| SupporterAccessSheet / ExpiryChip | temporary identity, countdown and authorization |
| AccountFooter / ProfileEditor / ThemePicker / SessionList | coherent settings and security |
| ConfirmDialog / ContextMenu / BottomSheet / Toast | consistent semantics, keyboard/VoiceOver |
| NotificationPermissionPrimer / UpdateBanner | user-initiated notifications and refresh |
| DebugBundlePreview / HelpSheet / OfflineSnapshot | safe issue export, docs and clearly stale data |

### Component acceptance rules

- Every interactive state: default, hover/pressed, focus-visible, disabled, loading, error and success as appropriate.
- UI behaviors must be reusable from both dashboard and terminal.
- Destructive actions require explicit review, not tiny X icons in every row.
- Every source of data has an API/owner, loading state, empty state, timestamp and meaningful failure mode.
- No real SSH secrets, host identifiers or personal content in design fixtures.
- Default light/dark parity; no hardcoded styling exceptions inside feature handlers.


## 5. P0 — critical foundations, security and reliability

All P0 work is a prerequisite to advertising Airshell as a trustworthy, general-purpose remote administration tool. P0 is not “optional polish.”

### 5.1 Design stabilization and architecture

- **P0-UI-01 [M] Single design-token authority:** create a versioned tokens file; map it into web CSS, React Native theme and SwiftUI Color assets; audit every hardcoded shade.
- **P0-UI-02 [L] Remove stylesheet cascade conflicts:** consolidate overlapping sidebar, home, terminal and light-theme styles. Keep an ordered temporary migration path, then delete unused overrides instead of accumulating new !important.
- **P0-UI-03 [M] One sidebar implementation:** stop duplicating structure in dashboard and terminal HTML; use a shared template/partial or defined client-side component with identical IDs/handlers.
- **P0-UI-04 [S] Flat status contract:** no box-shadow, glow, pulse or decorative halo on online/offline/checking dots. Add a visual regression assertion.
- **P0-UI-05 [S] Neutral colors only:** remove purple/blue-tinted incidental surfaces and random backdrop gradients, especially footer and selected rows.
- **P0-UI-06 [M] iPhone responsive audit:** capture 320/360/390/430 widths, zoomed text and landscape; fix header, keyboard, drawer, bottom overlay, truncation and safe-area bugs.
- **P0-UI-07 [M] Honest placeholders:** hide or mark disabled nonfunctional Inbox, Research, Roadmap, pinned examples, fake counts and demo content.
- **P0-UI-08 [M] Shared state contract:** centralize selected server, profile, auth, active chat, sidebar state and UI errors instead of ad-hoc DOM lookups.
- **P0-UI-09 [M] Accessibility pass:** VoiceOver audit of drawer, server actions, terminal controls, sheets and form errors; focus restoration after modals; keyboard operation.
- **P0-UI-10 [M] Design regression harness:** automate screenshots of selected Home/Terminal/Files/Settings states at target viewports and compare release-to-release.

### 5.2 Authentication, authorization and secrets

- **P0-SEC-01 [L] Replace indefinite remembered access:** revisit the documented ten-year cookie and shared terminal password. Define absolute session lifetime, idle timeout and explicit reauthentication for sensitive actions.
- **P0-SEC-02 [L] Device/session revocation:** add server-side revocable session identifiers and a “Signed-in devices” screen with revoke-all and revoke-one.
- **P0-SEC-03 [L] Strong account model:** plan per-user identity and distinct authorization; do not treat workspace-cookie possession as a sufficient multiuser access model.
- **P0-SEC-04 [M] Rate limit and abuse controls:** protected login, API, chat and WebSocket endpoints; IP/user/route budgets and secure backoff.
- **P0-SEC-05 [M] CSRF and origin review:** verify session cookies, state-changing methods, Origin/Host checks and WebSocket handshake authorization.
- **P0-SEC-06 [M] Protect local secret storage:** dedicated encryption key, rotation strategy, durable encrypted store; never derive everything from a changeable shared password without migration support.
- **P0-SEC-07 [M] SSH host-key verification UX:** pin fingerprint on first trustworthy connect, detect host key change, require explicit review. Avoid insecure automatic acceptance of changed keys.
- **P0-SEC-08 [M] Remote command safety:** per-operation allowlists for read tools; enforce server identity, user authorization, exact commands, timeouts, bounded outputs and noninteractive defaults.
- **P0-SEC-09 [L] Write approval integrity:** approval tokens bound to user/session/server/action/arguments/expiry; one-time execution; prevent post-approval argument substitution or replay.
- **P0-SEC-10 [M] Secret redaction everywhere:** redact SSH passwords, private keys, provider tokens, access cookies and env secrets from prompts, command output, logs and error bundles.
- **P0-SEC-11 [M] Prompt-injection boundary:** remote file/terminal output is untrusted data, not tool permissions or higher-priority instructions.
- **P0-SEC-12 [M] Persistence/retention policy:** documented lifetimes for terminal output chunks, chat, approvals, metrics and diagnostic exports; clear/delete UI.
- **P0-SEC-13 [M] Authorized temporary access:** supporter expiry means removal from Airshell, not revocation of external root SSH access; communicate this explicitly.
- **P0-SEC-14 [M] Root-risk review:** prefer non-root dedicated users; require clear warnings and privileges before supporter/root workflows.
- **P0-SEC-15 [M] Security test baseline:** follow OWASP ASVS 5.0 and targeted Web Security Testing Guide checks before any public onboarding.
- **P0-SEC-16 [M] Path and command sandboxing:** validate canonical remote paths, symlink handling, traversal and shell quoting; do not rely on string concatenation for permission boundaries.
- **P0-SEC-17 [M] Session isolation:** validate workspace/server permissions on every endpoint and WebSocket subscription, including reconnect and background jobs.
- **P0-SEC-18 [M] API response sanitization:** never return credential fields; use explicit output DTOs rather than spreading storage records.

### 5.3 Robustness and data integrity

- **P0-REL-01 [M] Deterministic reconnect:** WebSocket reconnect with exponential backoff, interruption state and no duplicate command replay.
- **P0-REL-02 [M] Connection lifecycle:** distinguish backend reachability, SSH handshake, auth failure, permission failure and stale sample.
- **P0-REL-03 [M] Session continuity truthfulness:** tmux reattachment when present; clearly label fallbacks that cannot survive disconnects.
- **P0-REL-04 [M] Terminal backpressure and bounds:** cap buffered output, rate limit inputs, protect memory and define resume semantics.
- **P0-REL-05 [M] Durable MongoDB migrations:** version data format, migration scripts, backup verification, transactional behavior where applicable.
- **P0-REL-06 [M] Backend health checks:** distinguish HTTP process alive from database available, SSH worker available and AI provider configured.
- **P0-REL-07 [S] PWA cache discipline:** static-only, versioned, safe update prompt; no caching of protected pages/APIs.
- **P0-REL-08 [M] Error taxonomy:** stable codes for auth/SSH/timeout/network/provider/files/approval failures with user-friendly guidance.
- **P0-REL-09 [M] Automated smoke tests:** sign-in, add/read/remove server, status, files, terminal connect/reconnect, approval rejection.
- **P0-REL-10 [M] Backup and disaster recovery test:** test restores for server metadata, encrypted credentials and workspace preferences; verify key continuity.

### P0 exit criteria

- No visual halo/gradient/shade regression on sidebar or status markers.
- No functional placeholders represented as real destinations.
- No accidental destructive operation on a tap or mismatched approval.
- Reconnect never submits a command twice; user sees stale/offline state.
- Sensitive APIs require valid scoped authentication; revocation and reauthentication policies work.
- The app passes a basic real-device test matrix and automated smoke suite.
- Release notes list all data retention and access changes honestly.

## 6. P1 — polished everyday product

### 6.1 Home, chat and contextual overview

- **P1-HOME-01 [M] Better empty state:** brief greeting, selected context and 3–4 real safe shortcuts instead of stacked filler.
- **P1-HOME-02 [M] Recently used servers:** last used and explicit pinning; preserve across sessions.
- **P1-HOME-03 [M] Quick command launcher:** Search/Command palette over chats, servers, routes and vetted actions.
- **P1-HOME-04 [M] Recent conversation list:** rename/archive/delete and search with timestamps.
- **P1-HOME-05 [M] Chat draft persistence:** per-conversation draft stored securely and never mixed between workspaces.
- **P1-HOME-06 [M] Stream controls:** visible stop, retry, copy, edit previous message and error recovery.
- **P1-HOME-07 [M] Rich content:** code blocks with copy, safe links, long tables scrollable, no unsafe HTML from model output.
- **P1-HOME-08 [M] Active-server context bar:** chosen host and permissions visible above composer.
- **P1-HOME-09 [S] Agent availability state:** “AI unavailable” when N_API/model not configured, with server-only features still usable.
- **P1-HOME-10 [M] Action history preview:** a compact recent-operations view linked to detailed receipts.
- **P1-HOME-11 [M] Smart suggestions grounded in state:** “Check disk pressure on server X” only if a real metric supports it.
- **P1-HOME-12 [M] Helpful onboarding cards:** dismissible, never return after dismissal without a product reason.

### 6.2 Server inventory and connection management

- **P1-SRV-01 [M] Server details screen:** verified state, last checked, SSH identity, provider metadata and quick actions.
- **P1-SRV-02 [M] Connection wizard:** SSH key/password/Instabox steps with field-level validation and diagnosis.
- **P1-SRV-03 [M] Server search and filters:** name/host/tags/status/environment, with no private hostname leaks to telemetry.
- **P1-SRV-04 [M] Favorites and ordering:** favorite groups, manual reorder, meaningful recent usage.
- **P1-SRV-05 [M] Group by environment:** Production, Staging, Development, Other; editable, neutral group headings.
- **P1-SRV-06 [S] Consistent row appearance:** flat status dot, 2 text lines, host truncation, proper targets.
- **P1-SRV-07 [S] Context menu for remove:** remove trailing default X; menu -> explicit confirmation.
- **P1-SRV-08 [M] Connection detail diagnostics:** DNS failure vs refused vs timeout vs changed host key vs bad auth.
- **P1-SRV-09 [M] Rename and label:** save nonsecret descriptions, environment, manual region/provider.
- **P1-SRV-10 [M] “Last known status” and freshness:** never confuse old success with current reachability.
- **P1-SRV-11 [M] Batch status refresh:** bounded concurrency and server cooldown to avoid polling storms.
- **P1-SRV-12 [M] Per-host preferred shell and directory:** only after validation and with least-privilege controls.
- **P1-SRV-13 [M] Standard connection expiry indicator:** only when actual credential/policy expiry exists.
- **P1-SRV-14 [S] Accessibility labels:** “Server X, online, last checked at …,” separate contextual actions.
- **P1-SRV-15 [M] Connection health history:** last N sampled states, gaps and unknown periods accurately shown.

### 6.3 Terminal interactions

- **P1-TERM-01 [M] Reliable iOS keyboard behavior:** composer/key strip respects viewport; no focus jump.
- **P1-TERM-02 [M] Configurable shortcut bar:** Esc, Tab, Ctrl, Alt, arrows, pipe, slash, tilde, Enter.
- **P1-TERM-03 [M] Font controls:** size, monospace font fallback, cell resize, contrast and cursor options.
- **P1-TERM-04 [M] Buffer search:** next/previous results using xterm search addon or equivalent.
- **P1-TERM-05 [M] Copy/selection:** long press, accessible selection and clipboard, no accidental secret copy to telemetry.
- **P1-TERM-06 [M] Session tabs:** multiple named sessions per server with explicit close/reattach semantics.
- **P1-TERM-07 [M] Reconnection timeline:** visible disconnected banner, last output sequence and resumed marker.
- **P1-TERM-08 [S] Clear viewport vs clear remote shell:** separate actions and truthful labeling.
- **P1-TERM-09 [M] Terminal resize stability:** ResizeObserver + debounced FitAddon + server PTY resize acknowledgment.
- **P1-TERM-10 [M] Scrollback controls:** “Jump to live” button only when scrolled away; badge for new output.
- **P1-TERM-11 [M] Open links safely:** allowlisted schemes; explicit warning before opening remote-provided URLs.
- **P1-TERM-12 [S] Session identity:** header includes server name and session title, not an ambiguous “Terminal.”
- **P1-TERM-13 [M] Enhanced offline/error UI:** DNS, auth, server offline, worker unavailable, socket lost all differ.
- **P1-TERM-14 [M] Keyboard accessory opt-in:** keep it unobtrusive and never obscure cursor/last line.
- **P1-TERM-15 [M] Terminal accessibility mode:** readable output alternative, reduced effects, documented limitations.
- **P1-TERM-16 [M] Safe clipboard/paste preview:** long multiline paste warning; preserve indentation and line breaks.

### 6.4 Files and editor

- **P1-FILE-01 [M] Better file navigation:** path breadcrumbs, up, refresh and friendly directory errors.
- **P1-FILE-02 [M] File-type indicators:** plain consistent icons, no random colors.
- **P1-FILE-03 [M] Rename/create folder:** explicit scoped write operations with validation.
- **P1-FILE-04 [M] Text editor MVP:** read and edit files with size limits and permission checks.
- **P1-FILE-05 [M] Syntax highlighting:** JSON, YAML, JS/TS, Python, Markdown, shell, config files.
- **P1-FILE-06 [M] Diff-before-save:** inspect edits line by line and confirm exact target path.
- **P1-FILE-07 [L] Atomic file writes:** temporary file + fsync/rename when possible, permissions preserved, recovery on failure.
- **P1-FILE-08 [M] Version/backup on edit:** bounded backup history, restore and user-visible retention.
- **P1-FILE-09 [M] Size and binary safeguards:** reject huge/incompatible text preview, don't decode binary as UTF-8 blindly.
- **P1-FILE-10 [M] File metadata:** size, owner/mode if available, modified date, symlink status.
- **P1-FILE-11 [M] Search within file:** match highlighting, wrap behavior and keyboard shortcuts.
- **P1-FILE-12 [L] Directory search:** bounded remote command, timeout and explicit root/path restriction.
- **P1-FILE-13 [M] Unsaved edit warnings:** Back/drawer navigation cannot drop draft silently.
- **P1-FILE-14 [M] No unsafe preview execution:** HTML/SVG/Markdown previews sandboxed or rendered inert; no remote scripts.
- **P1-FILE-15 [M] Text copy/download:** safe opt-in, content type, platform-specific file sharing.
- **P1-FILE-16 [M] Permissions error explanation:** display target user and denied operation; no suggestion to bypass controls.

### 6.5 AI assistant and approval UX

- **P1-AI-01 [M] Target server selector:** explicit persistent target before requesting operations.
- **P1-AI-02 [M] Tool-step timeline:** Inspect -> Interpret -> Plan -> Approval -> Execute -> Verify.
- **P1-AI-03 [M] Read-only vs write badge:** distinguish capabilities by real API policy.
- **P1-AI-04 [M] Exact command approval:** show literal command, target host, reason, risk and estimated impact.
- **P1-AI-05 [M] Diff approval for edits:** show before/after and exact file path.
- **P1-AI-06 [M] Scope and time of approval:** one action only unless user explicitly approves a bounded batch.
- **P1-AI-07 [M] Progress and cancellation:** cancel pending/long steps where safe, not claim kill worked unless acknowledged.
- **P1-AI-08 [M] Action receipt:** exact server, timestamp, tool, output/exit code, verification and status.
- **P1-AI-09 [M] Error explanations:** model/provider auth, context length, rate limit, timeout and lost connection.
- **P1-AI-10 [M] Server-awareness:** AI uses authenticated workspace inventory; never assumes hidden servers exist.
- **P1-AI-11 [M] Read-only diagnostic templates:** pre-vetted disk/memory/process/network inspections with bounded outputs.
- **P1-AI-12 [M] Distinguish source vs assistant claim:** clearly mark raw command output, model summary and user action.
- **P1-AI-13 [M] Chat retry/stop mechanics:** do not retry mutating tools automatically.
- **P1-AI-14 [M] Safe conversation export:** redaction preview before sharing conversation.
- **P1-AI-15 [M] Server file selection:** explicit file picker, context window and approval policy.
- **P1-AI-16 [M] Prompt injection tests:** adversarial log, file and shell content cannot override user approvals or execute silently.

### 6.6 Monitoring and activity

- **P1-MON-01 [M] Server overview:** CPU/RAM/disk/uptime metrics and last sample time, limited to what backend can measure.
- **P1-MON-02 [M] Refresh policies:** manual + 5/15/30/60 seconds, visible sampling and device/network costs.
- **P1-MON-03 [L] Bounded historical telemetry:** backend persistence and retention, not only browser arrays.
- **P1-MON-04 [M] Resource charts:** clear units and reference ranges; gaps displayed as gaps, not zeros.
- **P1-MON-05 [M] Disk pressure warnings:** configuration thresholds, sensible sample persistence.
- **P1-MON-06 [M] Connectivity history:** online/offline/unknown timeline without confidence overstatement.
- **P1-MON-07 [M] Activity timeline MVP:** real connections, approvals, job outcomes, changes and alerts.
- **P1-MON-08 [M] Severity and server filters:** accessible filters with reproducible results.
- **P1-MON-09 [M] Failure diagnosis bundle:** server test stage, safe error code, timestamps and guidance.
- **P1-MON-10 [M] Alert preferences:** explicit opt-in, dedupe, quiet hours and no private data in push body.
- **P1-MON-11 [M] System health panel:** show backend reachability, DB persistence status, SSH availability, AI configured/unavailable.
- **P1-MON-12 [M] Trust labels:** “read from remote host at 17:32,” never claim provider billing/uptime from unrelated metrics.

### 6.7 Account, native and PWA

- **P1-APP-01 [M] Profile screen:** coherent header, avatar, theme, security and permissions.
- **P1-APP-02 [M] Native UI parity checklist:** login, server list, chat, approvals, terminal and files must share backend semantics.
- **P1-APP-03 [M] Local secure credential handling:** native Keychain for appropriate local tokens; avoid storing remote SSH passwords in app plaintext.
- **P1-APP-04 [M] Native biometric app unlock:** optional on supported devices; not a substitute for backend authorization.
- **P1-APP-05 [M] Native share/copy:** safe host details, redacted diagnostics, file export with user intent.
- **P1-APP-06 [S] Background app behavior:** terminal session reattach rather than pretending iOS background execution is unlimited.
- **P1-APP-07 [M] PWA update notice:** user-visible “Update available” when new static version is ready, without interrupting active terminal work.
- **P1-APP-08 [M] PWA installation guide:** Safari -> Add to Home Screen, capability/limitation explanation.
- **P1-APP-09 [M] App icon and splash consistency:** match real brand without fake OS indicators or excessive delay.
- **P1-APP-10 [M] Haptic policy:** only meaningful action feedback; respect Reduced Motion and user settings.
- **P1-APP-11 [M] Theme synchronization:** no flash, dark/light/system parity across web and native.
- **P1-APP-12 [M] Localization architecture:** one clear UI language per locale; do not mix English and Hungarian in a single screen.
- **P1-APP-13 [S] Last workspace recovery:** show/retry known HTTPS URL without leaking private tokens.
- **P1-APP-14 [M] Mobile WebView audit:** no double status header, safe external link handling, cookie continuity and keyboard correctness.
- **P1-APP-15 [S] Settings import/export:** nonsecret UI preferences only; explicit explanation of exclusions.

### P1 release criteria

- A new user can connect a server without referring to GitHub docs, or receives a precise diagnosis.
- App can be used on 320px and 430px iPhones without clipped form controls or content hidden by safe areas.
- Common commands, files, chat and VM diagnostics work after ordinary network disruption and reauthentication.
- Every write or terminal command proposed by AI is reviewed, correctly bound, recorded and verified.
- No fake Inbox/Roadmap/Research destinations remain.
- Cross-page sidebar and themes visually match, without custom shaded exceptions.


## 7. P2 — advanced features and product differentiation

P2 features should be implemented only after P0/P1 workflows are stable. They add depth without sacrificing the calm basic app.

### 7.1 Advanced server operations

- **P2-SRV-01 [L] Tags and saved views:** examples: web, database, critical, personal, staging; filters sync with account.
- **P2-SRV-02 [M] Custom server ordering:** drag reorder with a non-drag accessible alternative.
- **P2-SRV-03 [L] SSH jump host / ProxyJump:** optional, explicit multi-hop architecture; distinct from simple Supporter VM reachability preflight.
- **P2-SRV-04 [L] SSH agent forwarding policy:** ideally disabled; only considered for explicit trusted contexts with safety warnings.
- **P2-SRV-05 [M] Key fingerprint review:** recognized host keys, changed-key history and remove/trust workflow.
- **P2-SRV-06 [M] Connection templates:** nonsecret host settings, SSH port and username defaults; never ship credentials in templates.
- **P2-SRV-07 [M] Expiring temporary access:** countdown, renew/recreate only after authorization; UI distinguishes server-side expiration vs remote credential expiry.
- **P2-SRV-08 [L] Shared server metadata with RBAC:** explicitly separate users and credential ownership; no implicit sharing.
- **P2-SRV-09 [L] Host dependency map:** manually defined relationships, not guessed topology.
- **P2-SRV-10 [L] Export/import configuration:** encrypted secure transfer with explicit recipient and rotation plan.
- **P2-SRV-11 [M] Favorite quick-connect actions:** one tap to open the selected host's own terminal or Files, not execute a command.
- **P2-SRV-12 [L] Connectivity diagnostics:** distinguish Airshell backend -> host network vs main VM -> supporter reachability where relevant.

### 7.2 Terminal power-user features

- **P2-TERM-01 [L] Split terminal on tablet/desktop:** two panels, independent sessions, visible target headers.
- **P2-TERM-02 [M] Session naming and pinning:** preserve names and explicit selection.
- **P2-TERM-03 [L] Searchable command history:** scope per-user/per-server; redact credentials; opt-in persistence.
- **P2-TERM-04 [M] Snippet library:** vetted commands with descriptions, variables and explicit preview.
- **P2-TERM-05 [L] Local terminal clipboard workflow:** paste multiple commands with newline review and accidental execution prevention.
- **P2-TERM-06 [M] Terminal text theme:** neutral presets, accessible foreground/ANSI color pairings.
- **P2-TERM-07 [L] Large-output virtualization/serialization:** bounded scrollback and explicit export; do not freeze iPhone.
- **P2-TERM-08 [M] URL recognition with secure open:** no automatic shell-command links or secret-bearing URL navigation.
- **P2-TERM-09 [M] Long-running job detach:** separate persistent tmux task from foreground terminal session; display actual status.
- **P2-TERM-10 [M] Terminal session history:** who connected, how long, and why ended, subject to privacy policy.
- **P2-TERM-11 [M] Configurable gestures:** two-finger horizontal history/terminal tab movement only when not conflicting with terminal apps.
- **P2-TERM-12 [L] Hardware keyboard shortcuts:** Ctrl/Alt pass-through, command palette and key mapping.
- **P2-TERM-13 [M] Terminal command privacy mode:** visually reduce sensitive pastes; server should still securely process input.
- **P2-TERM-14 [L] Read-only shared terminal observer:** explicitly scoped, audited and consented; no input without permission.
- **P2-TERM-15 [M] SSH connection test transcript:** redacted, stage-based debugging with safe copy.

### 7.3 Richer file workspace

- **P2-FILE-01 [L] Multi-file tabs:** unsaved badge, restore active tab, explicit close.
- **P2-FILE-02 [M] Compare two files:** read-only side-by-side and inline diff modes.
- **P2-FILE-03 [M] Config validation preflight:** JSON parse, YAML when supported, common config syntax checks before proposed save.
- **P2-FILE-04 [M] File permissions inspector:** read and proposed chmod/chown changes with explicit consequences.
- **P2-FILE-05 [M] Filename/path bookmarks:** per server and scoped to user.
- **P2-FILE-06 [L] Content search across allowed roots:** bounded size, timeout, file count and path restrictions.
- **P2-FILE-07 [L] Remote download/upload:** scoped size caps, virus/unsafe file handling, safe overwrite prompts.
- **P2-FILE-08 [M] Folder tree on wide screens:** keyboard accessibility and symlink/cycle handling.
- **P2-FILE-09 [L] Save history with recovery:** chronological revisions, optional retention limit, explicit restore.
- **P2-FILE-10 [M] File editor command palette:** jump to line, find/replace, format selection.
- **P2-FILE-11 [L] Atomic multi-file change proposal:** show per-file diffs and failure recovery, no all-or-nothing claim unless transactional.
- **P2-FILE-12 [M] Git-aware indicators:** show repository root/modified status only when Git is available and permissions allow.
- **P2-FILE-13 [M] Relative link path resolver:** never navigate outside approved root merely because a file contains a link.
- **P2-FILE-14 [L] File size and content policy:** confidential path exclusions and regulated data handling where relevant.

### 7.4 Monitoring, uptime and alerts

- **P2-MON-01 [L] Time-series backend store:** CPU, memory, disk, network and process metrics with aggregation and retention.
- **P2-MON-02 [M] Chart compare:** synced timestamps with a clear “missing data” pattern.
- **P2-MON-03 [M] Incident thresholds:** sustained CPU, high disk, memory exhaustion, SSH unreachable, certificate nearing expiry where inspected.
- **P2-MON-04 [L] Notification center:** queued events, read/unread, grouping and deduplication.
- **P2-MON-05 [L] Web Push for installed iPhone PWA:** permission from explicit gesture, actionable and not sensitive; supported home-screen web-app conditions apply.
- **P2-MON-06 [M] Optional email/webhook alert destinations:** verify ownership and prevent leakage.
- **P2-MON-07 [M] Scheduled weekly server summary:** actual sampled facts, concise trend and recommended inspections.
- **P2-MON-08 [M] Safe diagnostic snapshots:** redact private IP/hosts/secrets before export.
- **P2-MON-09 [L] Service health checks:** HTTP/TCP endpoint probes from authorized backend, not unbounded network scanner.
- **P2-MON-10 [M] Alert suppression windows:** maintenance mode, snooze and dedup policies; do not hide critical events silently.
- **P2-MON-11 [M] SLA/SLO definitions:** explicitly documented uptime semantics, no claim from a few HTTP polls.
- **P2-MON-12 [L] Correlated incident timeline:** metrics, changes, disconnects, tool runs; correlation not guaranteed causation.
- **P2-MON-13 [M] Metric retention/export:** CSV with timestamp zone and units, avoid leaking sensitive hosts.
- **P2-MON-14 [L] Process inspection:** bounded process list, resource usage and authorized details, no broad process environment dump.
- **P2-MON-15 [L] Service management:** inspect systemd unit status first; stop/restart requires explicit command approval.
- **P2-MON-16 [L] Docker inspection:** authorized hosts only; containers, logs, resource figures, nonsecret status.
- **P2-MON-17 [L] Disk explorer:** mountpoints, major directories by usage, large file detection with bounded sampling.
- **P2-MON-18 [M] Smart quiet status:** if all servers are fine, show one calm line instead of a full screen of green cards.

### 7.5 AI workflow intelligence and task ownership

- **P2-AI-01 [L] Named workspaces/projects:** group servers, chats and files with explicit scope.
- **P2-AI-02 [M] Context references:** attach a chosen metric snapshot, selected log lines or a file with user permission.
- **P2-AI-03 [L] Session-aware memory for work:** summarize nonsecret working context, make it inspectable and deletable.
- **P2-AI-04 [M] Intent-to-plan:** translate “why is this VPS slow?” into diagnostic steps without mutating anything.
- **P2-AI-05 [M] Diff-first workflows:** display a safe minimal patch proposal before touching files.
- **P2-AI-06 [M] Verification recipe:** each action declares “how success will be checked” before approval.
- **P2-AI-07 [L] Draft runbooks:** AI converts observed steps into an editable, user-owned procedure, not an auto-run script.
- **P2-AI-08 [L] Multi-step approvals:** group only bounded, enumerated actions; dangerous steps require separate confirmation.
- **P2-AI-09 [M] Context-window management:** compact old tool results while preserving approvals and tool evidence.
- **P2-AI-10 [M] Better model fallback UX:** transparently switch only when permitted; do not silently change capability or expense.
- **P2-AI-11 [M] Provider usage dashboard:** show token/request counts and cost only where actual provider data exists.
- **P2-AI-12 [L] Agent evaluation suite:** repeatable tasks for SSH diagnostics, malformed files, refusals and prompt-injection attempts.
- **P2-AI-13 [M] Structured outputs:** typed tool-result schemas instead of extracting commands from free-form generated text.
- **P2-AI-14 [L] Confidence calibration:** “verified by command,” “inferred,” “unknown” rather than misleading numeric confidence.
- **P2-AI-15 [L] Parallel read-only diagnostics:** bounded fan-out, ordered result merging and cancellation.
- **P2-AI-16 [M] Change review summary:** show exactly what changed and what was *not* verified.
- **P2-AI-17 [M] Stop/rollback affordance:** offer only genuine supported recovery; don't claim universal undo.
- **P2-AI-18 [L] Role-specific assistant modes:** Explorer (read-only), Operator (approval-only writes), Auditor (review only) enforced by backend.
- **P2-AI-19 [L] Project document references:** reference explicit user-selected files, protect prompt boundary, show provenance.
- **P2-AI-20 [M] Assistant accessibility:** streaming announcements throttled for screen readers; structured tool results.

### 7.6 Automation with safety constraints

- **P2-AUTO-01 [L] Read-only scheduled checks:** inspect status/disk/memory/cert expiry; no writes in first release.
- **P2-AUTO-02 [M] Rule builder:** choose target servers, metric, threshold, duration, schedule and destination.
- **P2-AUTO-03 [M] Dry-run mode:** show what would run and which data would be collected.
- **P2-AUTO-04 [M] Run history:** success/failure, duration, trigger, sample timestamp, error code.
- **P2-AUTO-05 [M] Notifications:** dedupe/quiet hours/snooze, redacted payload, per-device subscription.
- **P2-AUTO-06 [L] Retry policy:** bounded retry, idempotency and rate limits; no uncontrolled loops.
- **P2-AUTO-07 [L] Job queue:** durable queue with worker leasing, limits, cancellation and audit records.
- **P2-AUTO-08 [M] Disconnected-server skip:** never queue potentially destructive “catch-up” changes without renewed approval.
- **P2-AUTO-09 [L] Approval-at-execution for writes:** no indefinitely valid grants and no silent scheduled root commands.
- **P2-AUTO-10 [M] Maintenance window:** rule suspension and timed re-enable with visible status.

### 7.7 Native device integration

- **P2-IOS-01 [L] Fully native design parity:** SwiftUI screens share architecture/labels, not hand-translated ad-hoc concepts.
- **P2-IOS-02 [M] Offline read-only recent summary:** encrypted/redacted snapshots with timestamp; not offline terminal.
- **P2-IOS-03 [M] Secure biometric app lock:** iOS authentication APIs with fallback to backend login.
- **P2-IOS-04 [M] Spotlight and Siri shortcuts:** safe navigation to server detail or latest approved report, not root execution.
- **P2-IOS-05 [L] iPad adaptive split views:** server list + detail + inspector when screen permits.
- **P2-IOS-06 [M] Handoff/deep links:** authenticated navigation to server/chat/files; never embed credentials.
- **P2-IOS-07 [M] System share sheet:** redacted reports and sanitized text, user-controlled.
- **P2-IOS-08 [M] Local keyboard shortcut preferences:** external keyboard on iPad/macOS browser.
- **P2-IOS-09 [M] Notifications controls:** opt-in per event, quiet hours and privacy-safe preview.
- **P2-IOS-10 [L] On-device encrypted draft store:** terminal draft is *not* queued for execution offline.
- **P2-IOS-11 [M] Native copy/paste safeguards:** warn when pasting multiple shell lines into live session.
- **P2-IOS-12 [M] Home Screen quick actions:** open app chat/servers, no execution without authentication.
- **P2-IOS-13 [L] Distribution build matrix:** document Apple SDK, signing, physical-device, TestFlight and permitted EU distribution realities before claiming an IPA route.
- **P2-IOS-14 [M] Reachability and data-saving modes:** adaptive diagnostic refresh over cellular.
- **P2-IOS-15 [M] Respect content-size category and Reduce Transparency/Motion:** test native and WebView behavior separately.

## 8. P3 — innovative ideas to prototype, not blindly ship

These are differentiators, not obligations. Each idea needs a prototype, a privacy/security review and a measured benefit before productization.

| Idea | User value | Guardrail / experimental question |
| --- | --- | --- |
| **I-01: Server Pulse** | one-line “what changed since yesterday?” per host | only from real historical samples, label uncertainty |
| **I-02: Explain-before-execute** | preview plain-language impact alongside literal SSH command | literal command remains authoritative; no hidden execution |
| **I-03: Incident Story** | chronological narrative of alerts, changes and recovery | correlation must not be presented as proven cause |
| **I-04: Smart Triage Queue** | rank servers by real severity rather than by raw CPU | explain scoring inputs, avoid misleading urgency |
| **I-05: One-screen Health Snapshot** | swipeable overview with verified CPU/disk/network values | no decorative gauges or invented data |
| **I-06: Guided Fix Cards** | user-selectable recovery recipes for common incidents | read-only diagnosis first; privileged fixes separately approved |
| **I-07: Command Simulation** | preview estimated effects against a safe test environment | never claim simulation matches production perfectly |
| **I-08: Risk-aware Approval** | confirmation depth scales with risk and reversibility | backend policy determines severity, not only AI output |
| **I-09: Change Receipts** | signed, redacted record of each AI-assisted edit | verify integrity, retention and who can view |
| **I-10: Session Time Machine** | replay sanitized terminal events to understand an incident | explicitly opt-in; avoid storing secrets/typed passwords |
| **I-11: Daily Ops Digest** | small factual summary without opening each VPS | user-controlled cadence, cost and privacy |
| **I-12: Auto-context Composer** | context bar suggests target based on selected screen | cannot silently change server on send |
| **I-13: Universal Quick Switcher** | type a few letters to jump to server/chat/file | search entirely within authorized workspace |
| **I-14: Human-readable SSH Failure Tree** | direct questions and fixes for the failed stage | never auto-rewrite sshd, firewall or root auth |
| **I-15: Recovery Checklist** | a guided path after accidental config changes | backups and permissions verified before offering restore |
| **I-16: Production Safety Mode** | stronger confirmations, read-only default for production | user cannot bypass security policy with UI-only toggle |
| **I-17: Contextual Mobile Keystrip** | show Esc/Tab/CTRL based on real active terminal mode | no fake vim/bash mode guesses; let users customize |
| **I-18: Pin Important Output** | bookmark nonsecret terminal lines inside a session | opt-in storage and redaction |
| **I-19: “What did the agent do?”** | clear, terse command/file action digest | tool evidence attached to each step |
| **I-20: AI Runbook Studio** | turn verified workflow into an editable reusable playbook | approval and validation at every later execution |
| **I-21: Cross-server Comparison** | synchronized metrics for selected servers | compare same metric/time window, not unlike units |
| **I-22: Dependency Impact View** | visualize manually supplied service relationships | do not pretend auto-discovered topology |
| **I-23: Maintenance Compass** | track due backups, pending updates and certificate checks | only from inspected facts and configured targets |
| **I-24: Work Session Journal** | optional private notes and actions grouped by task | end-to-end access controls and deletion |
| **I-25: Permission Heatmap** | make SSH user/privilege scope easier to reason about | do not probe unrelated accounts or expose secrets |
| **I-26: Incident Handoff Pack** | redacted report for trusted collaborators | explicit user preview and recipient |
| **I-27: Safe Remote Screenshot** | inspect a service UI in a tightly scoped sandbox | never silently access arbitrary networks or private sites |
| **I-28: Query-to-Chart** | ask “disk used last 48h?” and see sourced graph | don't invent samples; link source and timestamps |
| **I-29: Confidence Through Evidence** | attach command/log/sample evidence to conclusions | qualitative states, not deceptive numerical certainty |
| **I-30: Server Personality = Labels, Not Mascots** | easily distinguish work environments | no emoji-as-icon default or distracting avatars |
| **I-31: Private On-call Mode** | lock to incidents, minimize chat noise | user opt-in; no endless notifications |
| **I-32: Safe Follow-up Suggestions** | relevant next diagnostic after each result | read-only, evidence-based, no uncontrolled tool loop |
| **I-33: Secret Exposure Guard** | warn before sending credentials in chat or exports | client + server validation, no secret copies for scanning |
| **I-34: Scheduled Snapshot Compare** | show meaningful change between two known states | missing metrics stay missing |
| **I-35: SSH Session Handoff** | continue a session from web to native iPhone | device-bound auth, no credential sharing in links |
| **I-36: Explain Configuration** | parse a selected config and document what settings mean | treat config as data, not instructions; no writes |
| **I-37: Minimal Safe Ops Widget** | quick glance at health without opening full app | cached data timestamp and locked disclosure |
| **I-38: Feature Search Assistant** | help user discover actual supported commands | no hallucinated routes or unavailable features |
| **I-39: Cost-aware Diagnostic Mode** | reduce polling/API usage on metered plans | clear controls, do not degrade security |
| **I-40: Verified Fix Badge** | show proof after a change resolved an issue | only true when explicitly tested; not a cosmetic achievement |
| **I-41: Draft-only Automations** | assistant proposes a monitoring rule, user approves it | no task created or armed automatically |
| **I-42: Secure Command Collections** | reusable admin snippets with risk annotations | server side permission policy overrides snippets |
| **I-43: Files-as-Context Preview** | attach selected lines into chat with exact source path | opt-in and size cap, redaction preview |
| **I-44: Adaptive Density** | comfortable vs compact row height based on preference | accessibility wins over density |
| **I-45: Terminal Focus Mode** | hide optional chrome while typing | never hide connection identity or critical warnings |
| **I-46: Supporter Access Clock** | explicit expiry and action to review external access | not positioned as remote password revocation |
| **I-47: Runbook Diff Review** | compare changes to a saved workflow before using it | prevents approving one plan and running another |
| **I-48: User-owned Prompt Templates** | quick incident prompts with server variables | visible expansion before sending |
| **I-49: Rootless-first Helper** | suggest least-privilege account and sudo workflows | no automatic elevation |
| **I-50: Recovery Readiness Score** | show whether verified backups, snapshots and docs exist | transparent criteria; no fake scoring from insufficient data |

### Innovation decision rubric

For each idea, score 1–5 on user frequency, time saved, security risk, implementation complexity, maintenance burden, iPhone ergonomics and differentiation. Require a threat model for remote execution, a measurable hypothesis and an opt-out. Prototype the highest-value **read-only** ideas first: Server Pulse, Quick Switcher, Incident Story, sourced Query-to-Chart and Explain-before-execute.

## 9. Content, interaction and voice guidelines

### Microcopy

- Prefer “Connected” or “Online · checked 18:31” to “Everything is perfect.”
- Prefer “Unable to reach SSH service” + “Check host, port and network access” to “Something went wrong.”
- Prefer “Awaiting your approval” to an ambiguous loading spinner.
- Prefer “Executed with exit code 0; service health still unverified” to “Fixed!”
- Prefer “Last sampled 9 minutes ago” to misleading live graph coloring.
- Prefer “Remove saved connection” to “Delete server” when the operation does not delete the remote machine.
- Prefer “Support access expires in 2 days” to “VM will be deleted in 2 days,” unless that is demonstrably true.

### Interaction contracts

- Every primary button tells the user *what* will happen.
- Dangerous operations are named, reviewed and cannot be inferred from a decorative button.
- Tapping a server row navigates to details/terminal according to a documented consistent rule; a trailing menu owns management actions.
- Keyboard Enter must not send a multi-line shell paste unexpectedly; provide explicit controlled submission.
- Search results must not reorder under a user who is about to tap.
- The UI must remain stable during polling, especially server list status changes.
- Live stats announce major changes politely to screen readers; do not announce every numerical refresh.
- Links from untrusted terminal/file content always show safe target and open outside privileged application context when appropriate.
- Confirmation for actions touching production should identify environment and actual user identity, not just a red title.


## 10. Implementation architecture — incremental, testable, safe

### 10.1 Keep the backend as source of truth

**Existing:** Node.js 22 + Express 5, WebSocket, node-pty, MongoDB optional, SSH/OpenSSH external commands, xterm.js in browser, React Native/Expo wrapper and native SwiftUI source.

**Proposed architecture:**

- Server side validates identity, workspace membership, access rights, operation type, path scope, allowed command semantics, credentials and audit policy.
- Web, Expo and native UI are presentation clients; no privileged authorization check may live solely in CSS, JS buttons or SwiftUI view state.
- AI proposes structured operations; deterministic backend tools validate and enforce them.
- Remote SSH output and files remain untrusted input even when the user owns the server.
- Nonsecret metadata is separated from encrypted credentials and authorization records.
- A single API contract defines statuses, data freshness, errors, approval states and reauthentication challenges.
- Metrics/automation workers are isolated from interactive PTY traffic, with bounded queueing and resource budgets.
- Feature flags gate experiments and allow rollback without losing the core terminal.

### 10.2 Suggested backend module map (PROPOSED, not existing)

| Module | Responsibility |
| --- | --- |
| server/http-app | Express configuration, middleware, route registration |
| server/auth | login, per-device session, token rotation/revocation, permissions |
| server/security | CSRF/origin, rate limits, redaction, validation and policy |
| server/workspaces | workspace scoping and user membership |
| server/servers | inventory CRUD, connection records, metadata |
| server/ssh | connection verification, host key, transport and shell management |
| server/terminal | PTY sessions, WebSocket protocol, reconnect, backpressure |
| server/files | bounded listing, preview, atomic change and diff |
| server/diagnostics | read-only metrics, platform detection and refresh |
| server/ai | model adapters, conversation persistence, structured plans |
| server/approvals | binding, expiry, one-shot authorization and review |
| server/audit | redacted immutable action records, retention |
| server/monitoring | sample store, threshold rules, incidents |
| server/jobs | schedules, queues, leasing, retry and cancellation |
| server/supporters | temporary-access policy, expiry and authorization |
| server/profile | preferences, avatar metadata, device/session list |
| server/storage | MongoDB and local repository interfaces, migrations |
| server/api-contracts | typed request/response schemas and documented errors |
| server/observability | operational logs, traces and diagnostics without secrets |

First extract functions behind existing routes while preserving protocol compatibility. Introduce integration tests before moving responsibility. Avoid a rewrite that blocks SSH workflows for weeks.

### 10.3 Suggested web module map

- ui/tokens.css — only authoritative design tokens and theme mappings.
- ui/primitives — buttons, rows, icons, input, sheet, modal, status and tooltip.
- ui/layout — shared AppShell, adaptive sidebar, header and footer.
- features/chat — conversations, streaming, chat composer and tool timeline.
- features/servers — list, filters, detail, wizard, status rendering.
- features/terminal — xterm adapter, keyboard accessory and connection state.
- features/files — list, preview, edit, diff and save approval.
- features/settings — profile, security, theme, device sessions.
- features/activity — events and approval logs.
- features/monitoring — samples, alerts and history charts.
- features/automations — rule editor, schedule and execution history.
- infra/api-client — validated fetch helpers, session handling, abort and retry policy.
- infra/state — explicit stores/context per workspace and selected server.
- infra/offline — safe PWA static cache and nonsecret read-only snapshot storage if approved.

**Migration options:** short term keep progressive-enhanced HTML and modular plain JS; medium term evaluate TypeScript or a component library (React/Lit/etc.) only when it reduces duplication and test cost. Do not replace the current stack simply to get fashionable components.

### 10.4 Proposed API contract standards

- All protected endpoints require authentication and a validated workspace scope.
- Use stable machine-readable errors: code, message, safe detail, retryable, requestId.
- Each metric includes sampledAt and source plus status unknown/stale/current.
- Support pagination/cursors for large collections; bounded request bodies and response size.
- Mutations use request idempotency keys where retry could create duplicates.
- Use optimistic concurrency for edit operations: revision or content hash prevents lost updates.
- File and command arguments are fully validated server-side, independent of AI generation.
- Approval response binds exact serverId + operation + parameters hash + userId + expiry.
- Every tool action returns executionId, status, timestamps and safely redacted evidence.
- The native API client and web API adapter should consume the same contract.

### 10.5 API inventory: existing vs proposed

| Endpoint | Status | Purpose |
| --- | --- | --- |
| GET /api/servers | EXISTING | list authorized saved servers |
| POST /api/servers | EXISTING | verify and save authorized connection |
| GET /api/servers/:id/status | EXISTING | connection status and limited metrics |
| GET /api/servers/:id/details | EXISTING | host diagnostics |
| PATCH /api/servers/:id | EXISTING | rename and provider metadata |
| DELETE /api/servers/:id | EXISTING | remove saved connection, not remote host |
| GET /api/servers/:id/files | EXISTING | list remote directory |
| GET /api/servers/:id/file | EXISTING | bounded text preview |
| GET /api/supporters | EXISTING/documented | list temporary supporter records |
| GET /api/supporters/:id | EXISTING/documented | supporter details and remaining time |
| POST /api/chat | EXISTING | AI chat/tool pipeline |
| POST /api/chat/approve | EXISTING | pending tool approval |
| GET /api/chat/status | EXISTING | AI availability check |
| GET/PUT /api/profile | EXISTING | profile preferences |
| GET /api/terminal/logs | EXISTING | saved terminal log retrieval |
| GET /api/stats | EXISTING | application process/runtime stats |
| WebSocket /ws | EXISTING | terminal transport |
| GET /api/sessions | PROPOSED | list active device sessions |
| DELETE /api/sessions/:id | PROPOSED | revoke an individual session |
| POST /api/sessions/revoke-all | PROPOSED | revoke all other devices |
| GET/POST /api/chats | PROPOSED | server-side chat history with ownership |
| GET/DELETE /api/chats/:id | PROPOSED | conversation management |
| GET /api/servers/:id/metrics | PROPOSED | time range, aggregation and freshness |
| GET /api/activity | PROPOSED | paginated audit/incident events |
| GET /api/approvals | PROPOSED | pending and completed scoped approvals |
| POST /api/approvals/:id/decision | PROPOSED | exact action approval/rejection |
| POST /api/servers/:id/files/preview-change | PROPOSED | server-side diff and integrity preview |
| POST /api/servers/:id/files/commit-change | PROPOSED | approved bounded atomic change |
| GET /api/servers/:id/files/history | PROPOSED | file version metadata |
| GET/POST /api/alert-rules | PROPOSED | authorized threshold watch rules |
| GET/POST /api/automations | PROPOSED | rule creation and listing |
| GET /api/jobs/:id | PROPOSED | run state and evidence |
| POST /api/jobs/:id/cancel | PROPOSED | cancellation request with acknowledgment |
| GET /api/health/dependencies | PROPOSED/PRIVATE | internally scoped health diagnostics |
| GET /api/ui-capabilities | PROPOSED | backend-supported features by identity |
| GET /api/version | PROPOSED | app version, compatibility and feature flags |

Do not let a new route become public because it is “just read-only.” A read-only SSH command can still disclose credentials or private files. Exact request/response shapes belong in an OpenAPI or typed schema package with examples and test fixtures.

### 10.6 Data model proposal

| Collection / record | Essential fields | Privacy / retention |
| --- | --- | --- |
| users | id, displayName, auth factors, createdAt | no plaintext passwords |
| workspaces | id, ownerId, member roles, settings | explicit ownership |
| sessions | id, userId, device, createdAt, lastSeen, expiresAt, revokedAt | hashed tokens, TTL cleanup |
| servers | id, workspaceId, name, host, port, user, authMethod, labels, providerInfo | secret reference, no exposed private key |
| serverSecrets | serverId, encryptedPayload, keyVersion, rotatedAt | separate encryption boundary |
| sshHostKeys | serverId, fingerprint, verifiedAt, status | changes audited |
| terminalSessions | id, workspaceId, userId, serverId, status, lastSeq | bounded lifetime, no raw secret input |
| terminalLogs | workspaceId, serverId, seq, output, recordedAt | redacted, opt-in/retention |
| conversations | id, workspaceId, userId, title, messagesRef, updatedAt | delete/export controls |
| approvals | id, actorId, serverId, argumentsHash, scope, expiresAt, decision | one-time and immutable outcome |
| actionReceipts | id, approvalId, exact target, result, evidenceRef, timestamp | redacted, tamper detection |
| metrics | serverId, timestamp, cpu, memory, disk, network, sampleQuality | TTL and rollups |
| incidents | serverId, severity, openedAt, events, closedAt | sourced events only |
| alerts | ownerId, serverId, kind, threshold, duration, destinations | scoped delivery |
| automations | ownerId, server scope, trigger, actionType, enabled, nextRunAt | read-only default |
| jobs | automationId, lease, status, retryCount, startedAt, endedAt | bounded execution |
| fileRevisions | serverId, canonicalPath, hash, backupRef, creator, timestamp | encrypted/private, TTL |
| notificationSubscriptions | userId, deviceId, endpoint, encrypted keys, optedInAt | user revocation |
| productFlags | environment, featureKey, audience, enabled | guarded staged rollout |

Use indexes based on actual query plans. Examples: (workspaceId, serverId), (userId, updatedAt), TTL on session/short-lived records, (serverId, timestamp) for metrics, (automationId, status) for jobs. Define archival and deletion semantics before generating large histories.

### 10.7 WebSocket terminal protocol hardening

- Explicit protocol version and negotiated capability list.
- One authenticated workspace + server + session per authorized channel.
- Output messages carry monotonic sequence numbers, bounded buffer and timestamps.
- Reconnect uses last acknowledged sequence when available; if output was dropped, show a gap notice.
- Client “close viewer” must not silently kill a remote tmux process; separately confirm “terminate remote session.”
- Backpressure protects server memory and iPhone rendering; restrict enormous command output.
- Keepalive and timeout distinguish dead network, sleeping backend and disconnected host.
- Resize requests are bounded and debounced.
- Text input is never replayed on network reconnect without user's explicit intent.
- Audit only metadata by default; raw PTY transcript requires explicit policy and redaction.
- Do not expose a WebSocket shell via public anonymous tokens or unsafe cross-origin access.

## 11. Trust, privacy and operational safeguards

### 11.1 Threat scenarios to test

| Threat | Prevention and validation |
| --- | --- |
| Stolen remembered session | short lifetime, revocation, reauth for sensitive actions, device management |
| Guessing shared login password | rate limiting, strong auth, MFA/identity roadmap, no public brute-force path |
| CSRF on write API | verified origin, CSRF strategy, secure cookies and sensitive method checks |
| Cross-origin WebSocket hijack | authenticated upgrade + Origin/Host validation + per-server access checks |
| SSH host impersonation | host-key pinning and explicit fingerprint change review |
| Malicious terminal output | safe text rendering and separation from model instructions |
| Prompt injection in config/log | tool enforcement isolated from untrusted content, no inherited permissions |
| Confused-deputy approval | exact argument hash + one-time scoped token + expiry |
| Recursive destructive command | deterministic policy, user review, least privilege, restricted targets |
| Path traversal/symlink race | canonical remote path, sandboxing and race-aware APIs |
| Secrets in error/trace | structured redaction and sensitive-path exclusions |
| Stale online indicator | timestamp and expiry; “unknown” or “stale” rather than green |
| Backup not restorable | periodic tested restore, key management and migration rehearsal |
| Service worker private cache | static allowlist, no protected API/HTML/terminal caching |
| Notification leaking host/secret | generic locked-screen content and per-device controls |
| Data shared across workspaces | server-side authorization on each object and WebSocket event |
| Automatic job execution without consent | read-only default, expiry and scoped approval at execution time |

### 11.2 Privileged operation policy

1. **Read-only inspection:** backend-approved bounded command, logged as an inspection, can run within authenticated scope.
2. **Write/edit operation:** exact diff or command and target shown in UI; authenticated user approves; backend checks one-time token, permission and expiry.
3. **Destructive/high-risk operation:** additional explicit confirmation; if production, tighter scope and optional reauth.
4. **Bulk/multi-server operation:** enumerate targets; do not permit dynamic expansion after approval.
5. **Scheduled operation:** read-only by default. Writes require a distinct execution-time grant and separate product policy.
6. **Rollback:** offer only if a verified backup or reversible operation exists. Never invent undo.
7. **Verification:** gather an independent post-action read/check; exit code alone does not prove outcome.
8. **Audit:** record what was approved and attempted, what actually ran, verification evidence, failed/partial states and actor.

### 11.3 Log and privacy policy

- Redact standard secrets before storing, previewing, transmitting to AI, including tokens and passwords in command output.
- Keep an explicit denylist for sensitive file paths and prohibit indiscriminate reading of .env, private keys, auth credentials and browser cookies.
- Show users what remote data is being sent to external model providers; allow opt-out or read-only local-mode flows where feasible.
- Avoid capturing terminal keystrokes for analytics. Operational logging should be privacy-preserving and configurable.
- Distinguish terminal output buffer used for reconnect from persistent audited logs.
- Provide deletion/export flows for chat history, nonsecret profile data, saved server metadata and recorded diagnostic data as appropriate.
- Do not send raw server hostnames or account details to analytics by default.
- Publish data retention, security limitations, backups and supported platform behavior in settings/help.

### 11.4 Authentication modernization path

- Phase A: document current shared-password limitations; rate limit; shorten or justify session durations; reauthenticate destructive actions.
- Phase B: introduce per-device revocable sessions and device list; isolate workspace ownership.
- Phase C: optional/passkey and TOTP approaches with secure account recovery and anti-lockout design.
- Phase D: multi-user roles and least privilege only after clear threat model, invitation/revocation, audits and ownership migration.

Do not add “Face ID security” as a superficial native overlay while the backend still accepts an unrevocable long-lived cookie.

## 12. Performance, reliability and platform targets

### Performance targets (proposed, to measure on device)

| Measure | Target | How to test |
| --- | --- | --- |
| Drawer open | visually smooth at 60Hz class, no visible layout jank | mid-range iPhone, open/close 20 times |
| Tap feedback | visible under ~100ms | device recording/high-speed inspect |
| Initial shell UI | useful shell quickly on normal 4G | cold and warm network tests |
| Chat token rendering | incremental without full-page reflow | long streaming response |
| Terminal typing | keystrokes appear with minimal perceptible delay | Wi-Fi and cellular |
| Terminal scroll | no noticeable dropped frames on bounded output | stress long output |
| Server status | displays sampling age and state; never fake freshness | slow/unavailable host |
| API timeout | explicit per endpoint; no endless spinner | blocked SSH and provider failures |
| JS payload | enforce documented size budget by route | build report/bundle analyzer |
| Memory | bounded terminal output and virtualized histories | 30-minute stress on iPhone |
| Service worker | no private content in cache | cache inspection/security test |
| Keyboard | last line, send and approval buttons visible | iOS Safari and WebView |

Latency thresholds must be established from real baselines; avoid pretending all 4G networks meet one absolute value. Measure cold start, warm start, background/foreground, 3G/4G simulator throttling, offline, stale DNS and server sleep.

### Performance tactics

- Request deduplication and AbortController per view transition.
- Avoid polling status for invisible screens or backgrounded PWA when not required.
- Batch status checks with bounded concurrency, adaptive intervals, exponential backoff and jitter.
- Cancel stale network requests on server switches; never render old host stats into newly selected host.
- Render only visible rows in very long logs/lists; avoid unnecessary DOM mutation.
- Defer nonessential asset loading; preconnect only to known trusted domains.
- Reduce CSS cascade complexity to improve predictability and debugging.
- Respect prefers-reduced-motion and low-power settings where available.
- Use xterm.js maintained addons for fit/search/accessibility where verified and compatible.
- Prefer explicit diagnostic metrics over expensive continuous full-system SSH command loops.
- Implement zero-secrets structured logs with safe request IDs for troubleshooting.

## 13. Quality strategy and automated test suite

### 13.1 Suggested testing tools

- Backend: Node test runner / chosen framework with API integration tests; stub SSH transport for deterministic failures.
- Web: Playwright for functional flows, snapshots, keyboard/viewport behavior and visual regression.
- Accessibility: axe-core automated checks plus real VoiceOver/keyboard manual passes.
- Native: Xcode/XCTest where macOS CI is available, Swift unit tests, physical-device manual tests.
- Expo: RN testing library for reusable native components and end-to-end review on a supported device build.
- Security: static secret scanning, dependency audits, ASVS checklists, negative authorization tests, prompt-injection fixtures.
- Load: bounded WebSocket/terminal-output testing, rate-limit tests and simulation of network drops.

### 13.2 Device and state matrix

| Scenario | Required coverage |
| --- | --- |
| Width 320/360/375/390/402/430 | drawer, header, server list, composer, terminal toolbar |
| Tablet portrait/landscape | adaptive navigation and split view |
| Desktop 1024/1440 | sidebar/panels, keyboard shortcuts, focus |
| Light/dark/system | true semantic colors, no unwanted shade/glow |
| Font size 100/150/200% | readable, scrollable, no clipped actions |
| Reduced motion / high contrast | no essential animated-only communication |
| VoiceOver | correct spoken status, selection and focus order |
| Keyboard open/closed | terminal cursor, bottom controls, forms |
| 0 / 1 / 3 / 100 servers | empty states, long lists, scrolling |
| Long Unicode host names | proper ellipsis and accessible full label |
| Online/offline/unknown/stale | flat dot + text + timestamp |
| SSH key rejected/host key changed | clear auth and trust diagnostics |
| 401 / 403 / 429 / 500 / timeout | useful recovery; no secrets in error |
| Provider AI unconfigured | core server and terminal workflows still function |
| Lost network mid-command | no duplicate send, preserved evidence |
| App background/restore | honest reconnect and state |
| Server removed while terminal open | graceful close and explanation |
| Supporter connection expires | inaccessible after expiry, clear messaging |
| Unsaved file change | confirmation before navigation |
| Approval expires/reused | reject, no side effects |
| Malicious tool output | treated as data, not instructions |
| PWA update with terminal open | avoid forced reload and data loss |

### 13.3 Golden visual scenarios

Record consistent synthetic fixtures:

- Home empty conversation, Home active chat, Home streaming, Home network error.
- Sidebar closed/open with 3 servers; expanded/collapsed; 320/390/430; long hosts; no dot glow.
- Search open with keyboard, search no results, search dismiss.
- Terminal connected, terminal reconnecting, terminal with extra key strip, terminal selected text.
- Files empty, files list, code preview, unsaved edit and diff review.
- VM settings metrics fresh/stale/unavailable, theme dark/light.
- Approval read-only, approval high-risk, rejected and expired.
- Account sheet, device sessions, sign-out confirmation.
- Native iOS first-run, authentication, server list, chat and terminal in portrait/landscape.

For each golden state, compare against baseline *after* design review. A visual test should catch a stray gray gradient, purple tint, halo, incorrect radius, oversized footer or hidden server action before merging.

### 13.4 Code quality gates

- Format/lint for JS, TypeScript, Swift and CSS as supported; validate HTML semantics.
- Unit tests for URL validation, data scopes, status state machines, approval hashing, expiry, path normalization and error mapping.
- Integration tests for API authorization, connection failure and terminal reconnect.
- No unsafe new package without dependency review, maintenance check and license verification.
- Type schemas on API boundaries, request/response validation, clear error codes.
- No regression to credentials displayed in client responses or logged.
- Every PR includes before/after screenshots for visual changes and smoke evidence for behavior changes.
- Feature flags and rollback strategy for migrations/experimental functionality.


## 14. Step-by-step delivery roadmap

Deliver vertical slices that can be verified on a real phone rather than redesigning the entire UI and backend in one risky commit.

| Phase | Focus | Depends on | Ship evidence |
| --- | --- | --- | --- |
| **0 — Baseline** | tests, screenshots, design freeze, current capability audit | none | reproducible app and issue inventory |
| **1 — Stabilize UI** | tokens, sidebar, colors, typography, responsive states | 0 | iPhone screenshots, no glow/shade regression |
| **2 — Security foundation** | sessions, SSH trust, scoped approvals, secrets | 0 | auth tests, audit threat-model signoff |
| **3 — Core product polish** | server list, details, connection wizard, terminal | 1 + 2 | end-to-end first-server and reconnect passes |
| **4 — Chat + file workflow** | conversation UX, AI approval receipt, file diffs | 2 + 3 | safe read/approve/write/verify test |
| **5 — Real monitoring** | source timestamps, histories, incidents and alerts | 2 + 3 | truthful sample + failure state tests |
| **6 — Native parity** | SwiftUI app UX, authentication, files/terminal reliability | 2 + 3 + 4 | physical-device acceptance matrix |
| **7 — Automations** | read-only watch rules, jobs, push preferences | 2 + 5 | safe recurring test + opt-out |
| **8 — Advanced studio** | snippets, runbooks, file history, splits, integrations | stable phases 3–7 | scoped beta validation |
| **9 — Experiments** | high-scoring innovative concepts | measurements from shipped features | evidence-led prototype review |

### Phase 0: baseline and decisions

1. List actual routes and live deployment versions, compare to README.
2. Inventory all CSS sources and identify which override wins per page.
3. Capture screenshots on Home, Terminal, Files, Settings and sidebar.
4. Record an iPhone video of opening drawer, scrolling, search and keyboard.
5. Add deterministic demo fixtures with no real server addresses or secrets.
6. Define current auth/session/SSH credential storage threat model.
7. Confirm the source-of-truth project among web, Expo and SwiftUI, and how each is distributed.
8. Establish smoke tests before structural refactors.

**Exit:** current behavior reproducible; known defects filed with screenshots and severity.

### Phase 1: eliminate weird-looking UI

1. Create design token sheet with dark/light semantic colors.
2. Replace the scattered CSS overrides with one ordered component stylesheet/module structure.
3. Remove unwanted shadow, gray wash, gradient mask and glowing connectivity status markers.
4. Normalize sidebar icon size, wordmark, search actions, rows, section headings and footer.
5. Hide raw remove-X on each server; use accessible context menu.
6. Normalize server row heights and selected state throughout web app.
7. Fix keyboard/composer and safe-area interplay.
8. Screenshot at 320/360/390/430 and compare.
9. Ensure terminal and dashboard use exactly the same sidebar component.
10. Reject any PR that reintroduces random palettes, decorative gradients or dead actions.

**Exit:** premium neutral iPhone sidebar; no duplicate nav, clipped names, halo dots or inaccessible footer.

### Phase 2: harden the security boundary

1. Make security behavior explicit and test existing auth/session/WS flows.
2. Introduce bounded/session-revocable authentication with recovery path.
3. Add rate limits, strict origin handling, permission-bound WebSocket auth.
4. Separate workspace/role/credential/access concepts.
5. Bind approvals to exact command/diff/server/user, expiry and one-time use.
6. Add event audit records and redaction.
7. Verify SSH host fingerprints, remote path restrictions and command timeouts.
8. Update Supporter VM docs to accurately describe preflight, direct access and expiry.
9. Run negative tests: 401/403, stale approvals, injections, host change and revoked sessions.
10. Publish accurate security limitations.

**Exit:** security-sensitive write paths cannot bypass policy or reuse someone else's approval.

### Phase 3: flawless core iPhone operation

1. Streamline “add server” wizard and step-by-step error handling.
2. Add real server details and honest last-checked state.
3. Add pin/reorder/group/filter with stable selected host context.
4. Fix WebSocket terminal reconnect and visible interruption states.
5. Add terminal shortcut bar, font controls, copy/search and session tabs.
6. Make terminal xterm viewport reliably fit when keyboard opens.
7. Treat session close and remote process termination as distinct actions.
8. Add meaningful empty/loading/retry states.
9. Add tests on both Safari PWA and native WebView.
10. Recheck all navigation/back behavior and focus.

**Exit:** server -> terminal -> disconnect -> reconnect succeeds, with no lost user context or accidental replay.

### Phase 4: assistant and files without fear

1. Require target selection and show current context.
2. Standardize read-only diagnostic outputs and safety labels.
3. Show inspection, proposed edit/command, approval and verification in one timeline.
4. Add file preview, editable draft and diff-before-save.
5. Implement scoped atomic save/revision/backup flow.
6. Display actual exit codes, changed file hashes and post-change checks.
7. Make retry/cancel behavior unambiguous; don't re-execute writes after transport errors without checking.
8. Test malicious logs/files/prompts and incomplete operations.
9. Add accessible approval review on phone.
10. Store concise redacted receipts, not arbitrary raw secrets.

**Exit:** user can understand and verify every AI-assisted server change, including partial failure.

### Phase 5: monitoring and trusted intelligence

1. Decide sampling/retention policy and how data is obtained from remote host.
2. Add timestamped metrics and unknown/stale states.
3. Build graph history with gaps and consistent units.
4. Add basic alerts and Activity timeline.
5. Add redacted notifications and opt-in consent.
6. Track actual provider/host uncertainty honestly.
7. Prototype Server Pulse / Incident Story only after a real data history exists.

**Exit:** no graph implies live data when stale, and alert records link to real samples.

### Phase 6: mature native distribution

1. Agree on shared API contracts and feature parity.
2. Polish native SwiftUI screens with actual iOS navigation, native sheet and keyboard behavior.
3. Secure local storage, background reattachment and app-lock preferences.
4. Test on actual iPhone over cellular and when moving foreground/background.
5. Document xtool/Apple SDK requirements and device signing constraints honestly.
6. Provide PWA as stable distribution fallback without implying it is an IPA.

**Exit:** native has documented limitations, usable account security and the essential web workflows.

### Phase 7 and later: careful product expansion

Add read-only automation, history, rich runbooks, desktop split views and scored innovation prototypes. Require opt-in and explicit cost/privacy notes for features that monitor continuously or transmit data externally.

## 15. Prioritization by impact

### 15.1 Highest immediate return

| Rank | Work package | Why it comes first |
| --- | --- | --- |
| 1 | Security: sessions, scoped approvals, secret handling | protect a product that can execute remote commands |
| 2 | CSS consolidation + consistent neutral palette | remove recurring visual regressions and duplicated effort |
| 3 | iPhone terminal typing/reconnect | app is unusable if remote work breaks on keyboard or weak network |
| 4 | Server connection wizard + diagnostics | reduces failure and user confusion |
| 5 | AI plan/approve/verify UX | turns AI feature into something explainable and safe |
| 6 | Real activity and error states | operational trust depends on historical evidence |
| 7 | File diff/backup before save | reduces risk of production configuration errors |
| 8 | Native/PWA compatibility testing | prevents an attractive prototype from failing to install/use |

### 15.2 Product impact model

When choosing between two features, evaluate:

- **Frequency:** how often a real target user will invoke it.
- **Severity:** does it prevent outage/security/data loss, or mainly add convenience?
- **Time saved:** clicks, context switching, investigation minutes avoided.
- **Trust gain:** clearer evidence, less uncertainty, safer approval.
- **iPhone utility:** does it solve something difficult on a phone?
- **Implementation complexity and upkeep:** number of systems changed and long-term cost.
- **Capability truthfulness:** can the backend verify its claims?
- **Privacy exposure:** any new persisted data or third-party model transfer?
- **Reversibility:** can failed feature deployment be rolled back cleanly?

Sample weighted score (modify after product testing): Value = 3×frequency + 3×severity + 2×time saved + 2×trust + 2×mobile utility − 2×complexity − 3×security risk − 2×privacy risk. Do not use a score to overrule mandatory P0 safety work.

## 16. Detailed acceptance checklists

### 16.1 Sidebar / app shell

- [ ] Only one drawer opens; outside tap/Escape closes it.
- [ ] At 320px and 390px widths, every row/host displays without horizontal overflow.
- [ ] Header branding and actions have consistent alignment and touch area.
- [ ] Exactly one active navigation state is visible.
- [ ] Section headings are plain text; no random chips/shaded strips.
- [ ] Server status dots are flat, static, and do not glow.
- [ ] Connected/unknown/disconnected appear as verified source state with text or accessible label.
- [ ] Status updates do not shift list rows while a user is tapping.
- [ ] Hostnames truncate with full accessible text available.
- [ ] Account footer stays visible above iPhone safe area.
- [ ] Search does not trap focus or leave empty server-row wrappers.
- [ ] Destructive remove is not a small always-visible X.
- [ ] No default shadow or gradient on the drawer.
- [ ] Dark and light theme share structural layout and selection rules.
- [ ] Terminal and Home sidebar share implementation and visual tokens.

### 16.2 Terminal

- [ ] Current server identity is never ambiguous.
- [ ] User can type, scroll and use Esc/Tab/Ctrl on iPhone.
- [ ] Terminal remains usable while on-screen keyboard is visible.
- [ ] xterm columns/rows match rendered viewport after rotation.
- [ ] Network loss shows a clear banner; input is not silently queued.
- [ ] Reconnect does not resend previous terminal input.
- [ ] Resumed terminal shows missing output gap when needed.
- [ ] No unsupported claim that process persists without remote tmux.
- [ ] Close viewer and terminate remote session are distinct.
- [ ] Copy/paste of multiple shell lines has an intentional safe path.
- [ ] Long output does not exhaust memory or freeze phone.
- [ ] Screen-reader limitations and accessible alternatives are documented.

### 16.3 AI operations

- [ ] Tool output is untrusted and never upgrades permission.
- [ ] Target server and exact operation shown before approval.
- [ ] Approval expires and is bound to one hash/actor/target.
- [ ] Reject/reuse/expiry actually blocks the backend operation.
- [ ] Explicit risk disclosure for production and root operations.
- [ ] All writes are followed by real, separately checked verification where applicable.
- [ ] Failed and partial outcomes are not labeled successful.
- [ ] Sensitive strings redacted from chat/log/audit output.
- [ ] Stop/retry does not unknowingly duplicate a write.
- [ ] Every completed action has an accessible receipt.

### 16.4 Files

- [ ] Canonical path validation and symlink policy on server.
- [ ] File preview size/encoding limits.
- [ ] No script executes from preview.
- [ ] Editor warns before losing unsaved changes.
- [ ] Every proposed save shows a diff and exact host/path.
- [ ] Save detects concurrent modifications.
- [ ] Backup/restore evidence for edits according to defined policy.
- [ ] Permission failures are explained without unsafe bypass instructions.
- [ ] Large/binary files have explicit unsupported state.
- [ ] No protected content enters static PWA cache.

### 16.5 Native/PWA

- [ ] Web/PWA navigation and native screens don't duplicate toolbars.
- [ ] Real iPhone tested with Wi-Fi -> cellular -> background -> foreground.
- [ ] Account theme applied before main UI is visible.
- [ ] Status bar and safe areas follow iPhone hardware.
- [ ] Native local state has proper device protection.
- [ ] PWA update isn't forced during active terminal/input.
- [ ] PWA's offline pages clearly say SSH requires network.
- [ ] Native build/distribution instructions distinguish free development, paid official distribution, third-party sideloading and PWA.
- [ ] No download/installation link without a real verified build.

## 17. Product analytics without surveillance

### 17.1 Useful aggregate metrics

- First-server connection success rate, broken down by safe error category (not host value).
- Median time from onboarding to first verified server status.
- Rate of terminal reconnect recovery after network loss.
- Number of failed vs successful AI approval executions; specifically false-success incidents.
- Ratio of approvals reviewed vs denied; do not optimize toward accepting more privileged actions.
- Accessibility task completion and keyboard navigation success.
- Mobile performance, UI crash, JS error and backend 5xx rates.
- Percentage of viewers with stale metric timestamps.
- PWA update/reload recovery success and cache mismatch incidents.
- Support tickets caused by SSH fingerprints, provider auth, expired temporary access and broken cookies.

### 17.2 Forbidden default analytics

- Raw terminal keystrokes, stdout/stderr contents, SSH command strings, private paths, secret values, full chat content, browser cookies, SSH hostnames/IPs, exact personal identifiers or remote file contents.
- “Session replay” that records a user's terminal without informed consent.
- Unnecessary precise location, device fingerprinting or silent push enrollment.
- Linking usage analytics across workspaces without a user-visible need.

### 17.3 Feedback and experimentation

- Add private “Report issue” that previews a redacted diagnostics bundle.
- Add a simple “Was this diagnosis helpful?” action separate from execution approval.
- Use opt-in beta flags; publish capability changes in a changelog.
- Compare usability measures and safety outcomes before and after each redesign, not only screenshot aesthetics.

## 18. Documentation, design reviews and maintenance

### 18.1 Documents to maintain

| Document | Required content |
| --- | --- |
| plan.md | master feature roadmap, priority, accepted changes |
| README.md | accurate current capabilities and setup |
| DESIGN_SYSTEM.md | tokens, spacing, typography, radius, colors, icon and animation rules |
| COMPONENTS.md | UI component contracts and examples |
| SECURITY.md | threat model, session policy, SSH trust and responsible disclosure |
| API.md / OpenAPI | only actually implemented endpoints with versioned schemas |
| SUPPORTER_ACCESS.md | preflight vs direct SSH vs true jump-host behavior |
| MOBILE.md | PWA/Expo/native differences, build and distribution limits |
| TESTING.md | unit/integration/e2e/visual/mobile checklists |
| RUNBOOKS.md | safe deployment/recovery instructions |
| CHANGELOG.md | release notes, migrations and breaking changes |
| ADR/ | architectural decisions, considered alternatives and rationale |

### 18.2 Implementation PR template

Each development PR should answer:

1. Which plan IDs does this implement?
2. Is it existing code refactor, new feature, or experiment?
3. What user journey or risk does it improve?
4. What changes on web/PWA/Expo/native?
5. Which API/permission/data fields changed?
6. Are there any new secrets, logs or retention implications?
7. Where is the before/after screenshot or test output?
8. Which viewport and VoiceOver states were tested?
9. What happens offline, when disconnected or when API fails?
10. How can we roll back safely?
11. Was documentation updated to describe reality rather than proposed behavior?
12. What still cannot be verified?

### 18.3 Release checklist

- [ ] Latest main branch passes unit, integration and security smoke tests.
- [ ] No new high-severity vulnerability or secret exposure.
- [ ] Backend-compatible version tested with currently installed clients.
- [ ] App still launches without AI provider when only server tools are needed.
- [ ] iPhone visual regression screenshots approved.
- [ ] Active terminal survives/update behavior is understood.
- [ ] Auth and workspace scope enforced on any new endpoint.
- [ ] PWA static asset cache version updated only as necessary.
- [ ] Feature flag default and rollout audience documented.
- [ ] Database migrations include recovery and rollback.
- [ ] No unfinished UI placeholder shown as working feature.
- [ ] Readme and changelog match implemented functionality.
- [ ] Real deployment verified before saying “shipped” or “live.”

### 18.4 Suggested Codex execution strategy

Do not ask a coding agent to “implement all of plan.md” in a single pass. Use small explicit tickets, ordered by dependency, with screenshots and precise stop conditions.

**Example scoped ticket A — unify sidebar styles:** read current styles; remove conflicting selectors; consolidate neutral tokens; preserve all navigation, search, server and profile actions; test at 320/390/430; ensure no status glow; provide before/after screenshot; commit.

**Example scoped ticket B — improve connection wizard:** audit POST /api/servers and error mapping; display staged validation for SSH and Instabox; no secret logging; keep supporter access separate; cover auth/network errors; test successful/non-successful saves; commit.

**Example scoped ticket C — safe AI change receipt:** trace approval APIs end to end; add exact target/arguments binding, one-time expiry and redacted audit record; prevent replay and changed arguments; test reject/expired/replay; implement accessible frontend display; commit.

**Example scoped ticket D — native terminal layout:** inspect SwiftUI terminal and keyboard behavior; test physical device landscape/portrait; preserve WebSocket logic; fix safe areas/key strip/resize; add snapshots and native tests; commit.

**Example scoped ticket E — honest monitoring:** preserve current read-only metrics, add sampledAt + stale/unknown states, bounded refresh; do not invent provider identity or history; test slow and unavailable hosts; commit.

### 18.5 Open product decisions

- **Audience:** is Airshell for one trusted owner or a proper multi-user team? This determines authentication, sharing, billing and RBAC.
- **Primary application:** is the PWA main, or does native SwiftUI become the flagship interface? Maintain both without divergent semantics.
- **Session policy:** what absolute and inactivity limits make sense for remote administration, and what actions require reauthentication?
- **Secrets location:** MongoDB, local volume, dedicated encrypted store or managed vault?
- **SSH host keys:** how will trusted-first-connect fingerprints be collected and confirmed?
- **Automation boundaries:** read-only always, or separately authenticated and time-bounded writes?
- **Retention:** how long may logs, chat, telemetry, audit and backups live?
- **Cost:** how much polling, storage and AI inference can a personal VPS afford?
- **Notifications:** web push only, native push, email or user-selected combination?
- **User-visible brand:** Airshell vs Sycord names; choose one primary product name and use consistent casing.
- **Languages:** begin with complete English; add Hungarian/Romanian with localized strings and tests, not mixed labels.
- **Supporter VM:** exact intended meaning of “temporary” and process for remote credential revocation.
- **Production monitoring:** which hosts/paths are authorized, and how will those scopes be enforced?
- **Design ownership:** who approves exceptions to neutral palette, rounded geometry and no-glow policy?

## 19. External standards and references

These are research inputs, not claims that the current application complies with them:

1. Apple Human Interface Guidelines — Layout: https://developer.apple.com/design/human-interface-guidelines/layout
2. Apple Human Interface Guidelines — Sidebars (updated 2026): https://developer.apple.com/design/human-interface-guidelines/sidebars
3. Apple Human Interface Guidelines — Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
4. Apple Human Interface Guidelines — Design fundamentals: https://developer.apple.com/design/human-interface-guidelines/
5. W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
6. OWASP ASVS 5.0: https://asvs.owasp.org/
7. OWASP Web Security Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
8. xterm.js overview and addons: https://xtermjs.org/docs/guides/using-addons/
9. xterm.js maintained repository: https://github.com/xtermjs/xterm.js
10. Apple Web Push guidance: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
11. Current project README, connection guide, supporter API reference, terminal/home scripts, SwiftUI and Expo project files in MDavidka/Sycord-cloud.

## 20. Final product quality bar

Airshell should not feel like “a website with a terminal button.” It should feel like a coherent private operations workspace. The user should know **which server**, **which action**, **which permission**, **what evidence**, **what changed**, and **what remains uncertain**—without fighting nested menus, inconsistent colors, broken reconnects, or misleading claims.

**Immediate next action:** execute Phase 0 and Phase 1 visual/UX stabilization while planning Phase 2 security hardening in parallel. Then build P1 features as small, tested, end-to-end vertical slices. Treat P2/P3 as a menu of opportunities to validate, not a license to bloat the first usable release.

---

*This document is a living proposal. Mark entries as IMPLEMENTED only after code, test, documentation and deployment verification. Preserve a changelog when priorities or assumptions change.*
