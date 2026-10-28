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
