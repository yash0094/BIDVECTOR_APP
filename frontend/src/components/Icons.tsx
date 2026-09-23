import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

export function IconHome(p: IconProps) {
  return <svg {...base} {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
    <path d="M9.5 20v-6h5v6" /></svg>
}
export function IconSearch(p: IconProps) {
  return <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></svg>
}
export function IconColumns(p: IconProps) {
  return <svg {...base} {...p}><rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M9.5 4v16M15 4v16" /></svg>
}
export function IconShieldAlert(p: IconProps) {
  return <svg {...base} {...p}><path d="M12 3l7 3v5.5c0 4.6-3 8.2-7 9.5-4-1.3-7-4.9-7-9.5V6l7-3Z" />
    <path d="M12 8.5v4.2" /><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" /></svg>
}
export function IconWallet(p: IconProps) {
  return <svg {...base} {...p}><rect x="3" y="6.5" width="18" height="12.5" rx="2" />
    <path d="M3 10h18" /><path d="M16 14.2h2.2" /></svg>
}
export function IconBarChart(p: IconProps) {
  return <svg {...base} {...p}><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M3 20h18" /></svg>
}
export function IconUsers(p: IconProps) {
  return <svg {...base} {...p}><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx="17" cy="9" r="2.4" /><path d="M15.7 12.5c2.3.3 3.8 2 3.8 4.4" /></svg>
}
export function IconFileText(p: IconProps) {
  return <svg {...base} {...p}><path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M14 3.5V8h4" /><path d="M8.5 12.5h7M8.5 15.5h7M8.5 18h4" /></svg>
}
export function IconBell(p: IconProps) {
  return <svg {...base} {...p}><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
    <path d="M10 19a2 2 0 0 0 4 0" /></svg>
}
export function IconUserCircle(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" />
    <path d="M6 19c1.2-2.7 3.4-4 6-4s4.8 1.3 6 4" /></svg>
}
export function IconPlusCircle(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
}
export function IconClipboardList(p: IconProps) {
  return <svg {...base} {...p}><rect x="5.5" y="4.5" width="13" height="16" rx="2" />
    <path d="M9 4.5V3.3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.2" />
    <path d="M9 11h6M9 14.5h6M9 18h3.5" /></svg>
}
export function IconAward(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="9" r="5" />
    <path d="M9 13.2 7.5 21l4.5-2.4 4.5 2.4-1.5-7.8" /></svg>
}
export function IconBuilding(p: IconProps) {
  return <svg {...base} {...p}><rect x="5" y="3.5" width="14" height="17" rx="1" />
    <path d="M9 7.5h.01M15 7.5h.01M9 11h.01M15 11h.01M9 14.5h.01M15 14.5h.01" strokeWidth="2.4" />
    <path d="M10 20.5v-3.7a2 2 0 0 1 4 0v3.7" /></svg>
}
export function IconMenu(p: IconProps) {
  return <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
}
export function IconClose(p: IconProps) {
  return <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
}
export function IconLogout(p: IconProps) {
  return <svg {...base} {...p}><path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
    <path d="M14 15l4-3-4-3M18 12H9" /></svg>
}
export function IconSettings(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V19.5a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H4.5a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5A1.7 1.7 0 0 0 11.5 4.6V4.5a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5c.16.7.66 1.27 1.56 1.04h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.56 1.04Z" /></svg>
}
export function IconHelp(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="9" />
    <path d="M9.3 9a2.8 2.8 0 0 1 5.4 1c0 1.8-2.4 2-2.6 3.6" /><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" /></svg>
}
export function IconLock(p: IconProps) {
  return <svg {...base} {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="1.8" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" /></svg>
}

export function IconBookmark(p: IconProps) {
  return <svg {...base} {...p}><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-4-6 4V5.5a1 1 0 0 1 1-1Z" /></svg>
}
export function IconNetwork(p: IconProps) {
  return <svg {...base} {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" />
    <circle cx="12" cy="18" r="2.5" /><path d="M7.8 7.6 10.5 16M16.2 7.6 13.5 16M8.5 6h7" /></svg>
}
export function IconAlertTriangle(p: IconProps) {
  return <svg {...base} {...p}><path d="M12 4 21.5 20H2.5Z" />
    <path d="M12 10v4" /><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" /></svg>
}
export function IconPrinter(p: IconProps) {
  return <svg {...base} {...p}><path d="M7 8.5V4h10v4.5" /><rect x="4" y="8.5" width="16" height="8" rx="1.5" />
    <path d="M7 14h10v6H7Z" /></svg>
}
export function IconLandmark(p: IconProps) {
  return <svg {...base} {...p}><path d="M3 9.5 12 4l9 5.5" /><path d="M4.5 9.5v10M9 9.5v10M15 9.5v10M19.5 9.5v10" />
    <path d="M3 19.5h18" /></svg>
}
export function IconGauge(p: IconProps) {
  return <svg {...base} {...p}><path d="M4 15a8 8 0 1 1 16 0" /><path d="M12 15 16 9.5" />
    <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" /></svg>
}
export function IconLayers(p: IconProps) {
  return <svg {...base} {...p}><path d="M12 3.5 21 9l-9 5.5L3 9Z" /><path d="M3 14 12 19.5 21 14" />
    <path d="M3 11.5 12 17l9-5.5" /></svg>
}
export function IconChevronDown(p: IconProps) {
  return <svg {...base} {...p}><path d="M6 9l6 6 6-6" /></svg>
}
export function IconGlobe(p: IconProps) {
  return <svg {...base} {...p}><circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9Z" /></svg>
}

