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
