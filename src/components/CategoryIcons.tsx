// Custom illustrated category & subcategory icons
// Style: mobile.de inspired — stroke-based vehicle illustrations, 48x48 viewBox
// Design: stroke-based, 32x32 viewBox, currentColor, recognizable at a glance

interface IconProps {
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 32 32",
};

// 🚗 Transports — car side profile
export function IconTransports({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Car body */}
      <path d="M2 18 L5 12 Q6 10 8 10 L24 10 Q26 10 27 12 L30 18 Q30.5 19 30 20 L30 22 Q30 23.5 28.5 23.5 L3.5 23.5 Q2 23.5 2 22 L2 20 Q1.5 19 2 18Z" />
      {/* Cabin / roof */}
      <path d="M9 10 L11.5 5 Q12.5 4 14.5 4 L17.5 4 Q19.5 4 20.5 5 L23 10Z" />
      {/* Front & rear windshield */}
      <path d="M10 10 L12 5.5 L17 5.5 L19.5 10" strokeWidth="1.25" opacity="0.6" />
      {/* Wheels */}
      <circle cx="9" cy="23.5" r="3.5" strokeWidth="2" />
      <circle cx="23" cy="23.5" r="3.5" strokeWidth="2" />
      <circle cx="9" cy="23.5" r="1.2" strokeWidth="1.25" />
      <circle cx="23" cy="23.5" r="1.2" strokeWidth="1.25" />
      {/* Door line */}
      <line x1="16" y1="10" x2="16" y2="20" strokeWidth="1.25" opacity="0.5" />
      {/* Door handle */}
      <line x1="18.5" y1="16" x2="21" y2="16" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 🏠 Nekustamais īpašums — house with door and window
export function IconNekustamais({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Roof */}
      <polyline points="3,16 16,4 29,16" strokeWidth="2" strokeLinejoin="round" />
      {/* Chimney */}
      <rect x="20" y="6" width="3" height="5" rx="0.5" strokeWidth="1.5" />
      {/* House body */}
      <rect x="6" y="15.5" width="20" height="13" rx="1" strokeWidth="1.75" />
      {/* Door */}
      <path d="M13 28.5 L13 22 Q13 20.5 16 20.5 Q19 20.5 19 22 L19 28.5" strokeWidth="1.75" />
      {/* Window left */}
      <rect x="8" y="19" width="4" height="4" rx="0.75" strokeWidth="1.5" />
      {/* Window cross */}
      <line x1="10" y1="19" x2="10" y2="23" strokeWidth="1" />
      <line x1="8" y1="21" x2="12" y2="21" strokeWidth="1" />
      {/* Window right */}
      <rect x="20" y="19" width="4" height="4" rx="0.75" strokeWidth="1.5" />
      <line x1="22" y1="19" x2="22" y2="23" strokeWidth="1" />
      <line x1="20" y1="21" x2="24" y2="21" strokeWidth="1" />
    </svg>
  );
}

// 📱 Elektronika — smartphone with screen UI
export function IconElektronika({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Phone body */}
      <rect x="8" y="2" width="16" height="28" rx="3" strokeWidth="2" />
      {/* Camera + speaker */}
      <circle cx="16" cy="6" r="1.2" strokeWidth="1.5" />
      <line x1="13" y1="6" x2="14.5" y2="6" strokeWidth="1.5" strokeLinecap="round" />
      {/* Screen content — browser-like */}
      <rect x="10.5" y="9" width="11" height="16" rx="1" strokeWidth="1.25" />
      {/* Screen lines (content) */}
      <line x1="12" y1="12" x2="20" y2="12" strokeWidth="1" opacity="0.7" />
      <line x1="12" y1="14.5" x2="18" y2="14.5" strokeWidth="1" opacity="0.5" />
      <line x1="12" y1="17" x2="19" y2="17" strokeWidth="1" opacity="0.5" />
      {/* App icons grid */}
      <rect x="12" y="19.5" width="2.5" height="2.5" rx="0.5" strokeWidth="1" />
      <rect x="15.5" y="19.5" width="2.5" height="2.5" rx="0.5" strokeWidth="1" />
      {/* Home button */}
      <circle cx="16" cy="27" r="1.25" strokeWidth="1.5" />
    </svg>
  );
}

// 💼 Darbs un Pakalpojumi — briefcase
export function IconDarbs({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Briefcase body */}
      <rect x="3" y="12" width="26" height="17" rx="2.5" strokeWidth="2" />
      {/* Handle */}
      <path d="M11 12 L11 8 Q11 6 13 6 L19 6 Q21 6 21 8 L21 12" strokeWidth="1.75" />
      {/* Center divider */}
      <line x1="3" y1="21" x2="29" y2="21" strokeWidth="1.5" opacity="0.6" />
      {/* Clasp */}
      <rect x="13.5" y="19" width="5" height="4" rx="1" strokeWidth="1.5" />
      {/* Side pockets suggestion */}
      <line x1="8" y1="14" x2="8" y2="19" strokeWidth="1.25" strokeDasharray="1.5 1.5" opacity="0.5" />
      <line x1="24" y1="14" x2="24" y2="19" strokeWidth="1.25" strokeDasharray="1.5 1.5" opacity="0.5" />
    </svg>
  );
}

// 🛋️ Mājai un Dārzam — armchair/sofa + small plant
export function IconMajai({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Sofa back */}
      <path d="M5 20 L5 13 Q5 11.5 6.5 11.5 L25.5 11.5 Q27 11.5 27 13 L27 20" strokeWidth="1.75" />
      {/* Left armrest */}
      <path d="M3 20 Q3 17.5 5 17.5 L5 22.5 Q5 24 3.5 24 Q2 24 2 22.5 L2 21 Q2 20 3 20Z" strokeWidth="1.75" />
      {/* Right armrest */}
      <path d="M29 20 Q29 17.5 27 17.5 L27 22.5 Q27 24 28.5 24 Q30 24 30 22.5 L30 21 Q30 20 29 20Z" strokeWidth="1.75" />
      {/* Seat cushion */}
      <path d="M5 22.5 L5 20 Q5 18.5 7 18.5 L25 18.5 Q27 18.5 27 20 L27 22.5 Q27 24.5 25 24.5 L7 24.5 Q5 24.5 5 22.5Z" strokeWidth="1.75" />
      {/* Legs */}
      <line x1="8" y1="24.5" x2="8" y2="28" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="24.5" x2="24" y2="28" strokeWidth="2" strokeLinecap="round" />
      {/* Cushion divider */}
      <line x1="16" y1="18.5" x2="16" y2="24.5" strokeWidth="1.25" opacity="0.5" />
      {/* Small plant on the side */}
      <path d="M25 10 Q27 7 29 8 Q27 9 26 11" strokeWidth="1.25" opacity="0.7" />
    </svg>
  );
}

// 👗 Mode un Stils — t-shirt / dress
export function IconMode({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* T-shirt shape */}
      <path d="M11 4 Q12 2 16 2 Q20 2 21 4 L27 7 L24 12 L22 10 L22 28 Q22 29.5 20.5 29.5 L11.5 29.5 Q10 29.5 10 28 L10 10 L8 12 L5 7 Z" strokeWidth="1.75" />
      {/* Collar detail */}
      <path d="M11 4 Q13 7 16 7 Q19 7 21 4" strokeWidth="1.5" />
      {/* Small decorative line on chest */}
      <line x1="13" y1="16" x2="19" y2="16" strokeWidth="1.25" strokeDasharray="1.5 1" opacity="0.6" />
      {/* Hanger suggestion */}
      <path d="M16 2 L16 0.5" strokeWidth="1.5" />
    </svg>
  );
}

// 🍼 Bērniem — baby stroller / pram
export function IconBerniem({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Pram basket */}
      <path d="M6 14 Q6 10 10 10 L24 10 Q27 10 27 14 L27 20 Q27 23 23 23 L9 23 Q6 23 6 20 Z" strokeWidth="2" />
      {/* Hood/canopy */}
      <path d="M6 14 Q8 8 14 7 Q20 6 27 10" strokeWidth="1.75" />
      {/* Hood handle curve */}
      <path d="M14 7 Q16 5 18 6" strokeWidth="1.5" opacity="0.6" />
      {/* Handle bar */}
      <path d="M24 10 L28 5" strokeWidth="2" strokeLinecap="round" />
      {/* Wheels */}
      <circle cx="10" cy="26" r="3" strokeWidth="2" />
      <circle cx="23" cy="26" r="3" strokeWidth="2" />
      <circle cx="10" cy="26" r="1" strokeWidth="1.5" />
      <circle cx="23" cy="26" r="1" strokeWidth="1.5" />
      {/* Star decoration on pram */}
      <path d="M16 14 L16.6 15.8 L18.5 15.8 L17 17 L17.6 18.8 L16 17.7 L14.4 18.8 L15 17 L13.5 15.8 L15.4 15.8 Z" strokeWidth="1" />
    </svg>
  );
}

// 🏆 Sports un Hobiji — soccer ball
export function IconSports({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Ball outline */}
      <circle cx="16" cy="16" r="13" strokeWidth="2" />
      {/* Soccer ball pentagon pattern */}
      {/* Center pentagon */}
      <polygon points="16,10 20.5,13.5 18.8,19 13.2,19 11.5,13.5" strokeWidth="1.5" />
      {/* Top patch */}
      <path d="M16 3 L16 10" strokeWidth="1.25" opacity="0.7" />
      <path d="M10.5 5 L11.5 13.5" strokeWidth="1.25" opacity="0.7" />
      <path d="M21.5 5 L20.5 13.5" strokeWidth="1.25" opacity="0.7" />
      {/* Bottom patches */}
      <path d="M18.8 19 L22 27" strokeWidth="1.25" opacity="0.7" />
      <path d="M13.2 19 L10 27" strokeWidth="1.25" opacity="0.7" />
      <path d="M13.2 19 L8 22" strokeWidth="1.25" opacity="0.7" />
      <path d="M18.8 19 L24 22" strokeWidth="1.25" opacity="0.7" />
    </svg>
  );
}

// 🐾 Dzīvnieki — dog / cat face (clear animal face)
export function IconDzivnieki({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Head */}
      <circle cx="16" cy="18" r="11" strokeWidth="2" />
      {/* Left ear (floppy dog ear) */}
      <path d="M6 13 Q4 6 8 5 Q12 4 11 10" strokeWidth="1.75" fill="none" />
      {/* Right ear */}
      <path d="M26 13 Q28 6 24 5 Q20 4 21 10" strokeWidth="1.75" fill="none" />
      {/* Eyes */}
      <circle cx="12.5" cy="16" r="1.75" strokeWidth="1.5" />
      <circle cx="19.5" cy="16" r="1.75" strokeWidth="1.5" />
      {/* Eye shine */}
      <circle cx="13.2" cy="15.3" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="20.2" cy="15.3" r="0.5" fill="currentColor" stroke="none" />
      {/* Nose */}
      <ellipse cx="16" cy="20" rx="2" ry="1.5" strokeWidth="1.5" />
      {/* Mouth */}
      <path d="M14 21.5 Q16 23.5 18 21.5" strokeWidth="1.5" />
      {/* Whiskers */}
      <line x1="7" y1="20" x2="13" y2="20.5" strokeWidth="1" opacity="0.5" />
      <line x1="7" y1="22" x2="13" y2="21.5" strokeWidth="1" opacity="0.5" />
      <line x1="25" y1="20" x2="19" y2="20.5" strokeWidth="1" opacity="0.5" />
      <line x1="25" y1="22" x2="19" y2="21.5" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// 🔧 Cits — toolbox / wrench + screwdriver crossed
export function IconCits({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      {/* Wrench */}
      <path d="M8 6 Q5 6 4 9 Q3 12 5 14 L18 27 Q19.5 28.5 21.5 28.5 Q23.5 28.5 25 27 Q26.5 25.5 26.5 23.5 Q26.5 21.5 25 20 L12 7 Q11 6 9 6Z" strokeWidth="1.75" />
      <circle cx="22" cy="24" r="2.5" strokeWidth="1.5" />
      {/* Wrench head opening */}
      <path d="M5 9 Q4.5 7.5 6 7 Q8 6.5 9 8" strokeWidth="1.5" />
      {/* Screwdriver */}
      <line x1="24" y1="4" x2="10" y2="18" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 4 L28 5 L27 9 Z" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Small plus sign in center */}
      <line x1="16" y1="13" x2="16" y2="17" strokeWidth="1" opacity="0" />
    </svg>
  );
}

// ─── Transport Subcategory Icons (mobile.de style, 48x48) ────────────────────

const vBase = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 48 48",
};

// 🚗 Vieglie auto — sedan side profile
export function IconVieglieAuto({ className }: IconProps) {
  return (
    <svg {...vBase} className={className}>
      {/* Body */}
      <path d="M3 30 L6 22 Q8 18 12 18 L36 18 Q40 18 42 22 L45 30 Q46 31 45 33 L45 35 Q45 37 43 37 L5 37 Q3 37 3 35 L3 33 Q2 31 3 30Z" />
      {/* Cabin */}
      <path d="M14 18 L17 10 Q19 8 22 8 L26 8 Q29 8 31 10 L34 18Z" />
      {/* Windshields */}
      <path d="M16 18 L18.5 11 L29.5 11 L32 18" strokeWidth="1.25" opacity="0.5" />
      {/* Wheels */}
      <circle cx="13" cy="37" r="5.5" strokeWidth="2.25" />
      <circle cx="35" cy="37" r="5.5" strokeWidth="2.25" />
      <circle cx="13" cy="37" r="2" strokeWidth="1.5" />
      <circle cx="35" cy="37" r="2" strokeWidth="1.5" />
      {/* Door line */}
      <line x1="24" y1="18" x2="24" y2="31" strokeWidth="1.25" opacity="0.4" />
      {/* Door handle */}
      <line x1="27" y1="25" x2="31" y2="25" strokeWidth="1.75" strokeLinecap="round" />
      {/* Headlight */}
      <path d="M42 26 L45 26" strokeWidth="2" strokeLinecap="round" />
      {/* Tail light */}
      <path d="M3 26 L6 26" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 🏍️ Motocikli un kvadricikli — motorcycle side profile
export function IconMotocikli({ className }: IconProps) {
  return (
    <svg {...vBase} className={className}>
      {/* Rear wheel */}
      <circle cx="11" cy="34" r="9" strokeWidth="2.25" />
      <circle cx="11" cy="34" r="3" strokeWidth="1.75" />
      {/* Front wheel */}
      <circle cx="37" cy="34" r="9" strokeWidth="2.25" />
      <circle cx="37" cy="34" r="3" strokeWidth="1.75" />
      {/* Frame — swing arm + main frame */}
      <path d="M11 34 L18 22 L30 20 L37 34" strokeWidth="2" />
      {/* Engine/body block */}
      <path d="M18 22 L22 16 L30 16 L30 20 L18 22Z" strokeWidth="1.75" />
      {/* Fuel tank / seat */}
      <path d="M22 16 Q24 12 28 12 Q32 12 32 16 L30 16Z" strokeWidth="1.75" />
      {/* Fork */}
      <path d="M30 20 L35 28 L37 34" strokeWidth="2" />
      {/* Handlebar */}
      <line x1="30" y1="16" x2="34" y2="13" strokeWidth="2" strokeLinecap="round" />
      <line x1="33" y1="12" x2="36" y2="14" strokeWidth="2" strokeLinecap="round" />
      {/* Exhaust */}
      <path d="M18 22 L10 26 L8 28" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

// 🚛 Kravas auto un tehnika — truck cab + cargo
export function IconKravAsAuto({ className }: IconProps) {
  return (
    <svg {...vBase} className={className}>
      {/* Cargo trailer */}
      <rect x="3" y="16" width="26" height="18" rx="1.5" strokeWidth="2" />
      {/* Cab */}
      <path d="M29 22 L29 34 L45 34 L45 26 Q45 22 41 22 L29 22Z" strokeWidth="2" />
      {/* Cab roof */}
      <path d="M29 22 L33 16 Q35 14 38 14 L45 16 L45 22Z" strokeWidth="2" />
      {/* Cab window */}
      <path d="M33 17 L37 17 L40 22 L31 22Z" strokeWidth="1.5" opacity="0.7" />
      {/* Wheels — trailer */}
      <circle cx="10" cy="34" r="5" strokeWidth="2.25" />
      <circle cx="10" cy="34" r="2" strokeWidth="1.5" />
      <circle cx="21" cy="34" r="5" strokeWidth="2.25" />
      <circle cx="21" cy="34" r="2" strokeWidth="1.5" />
      {/* Wheels — cab */}
      <circle cx="38" cy="34" r="5" strokeWidth="2.25" />
      <circle cx="38" cy="34" r="2" strokeWidth="1.5" />
      {/* Cargo lines */}
      <line x1="3" y1="22" x2="29" y2="22" strokeWidth="1.25" opacity="0.4" />
      <line x1="3" y1="27" x2="29" y2="27" strokeWidth="1.25" opacity="0.4" />
    </svg>
  );
}

// 🚲 Velosipēdi un skrejriteņi — bicycle
export function IconVelosipedi({ className }: IconProps) {
  return (
    <svg {...vBase} className={className}>
      {/* Wheels */}
      <circle cx="12" cy="32" r="10" strokeWidth="2.25" />
      <circle cx="36" cy="32" r="10" strokeWidth="2.25" />
      <circle cx="12" cy="32" r="2.5" strokeWidth="1.75" />
      <circle cx="36" cy="32" r="2.5" strokeWidth="1.75" />
      {/* Frame — chain stay + seat stay */}
      <path d="M12 32 L22 18 L36 32" strokeWidth="2" />
      {/* Frame — down tube */}
      <path d="M22 18 L22 32 L12 32" strokeWidth="2" />
      {/* Top tube */}
      <line x1="22" y1="18" x2="34" y2="18" strokeWidth="2" />
      {/* Fork */}
      <path d="M34 18 L36 32" strokeWidth="2" />
      {/* Seat post + saddle */}
      <line x1="22" y1="18" x2="22" y2="12" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 11 Q22 10 26 11" strokeWidth="2" strokeLinecap="round" />
      {/* Handlebar stem */}
      <line x1="34" y1="18" x2="34" y2="13" strokeWidth="2" strokeLinecap="round" />
      <path d="M31 12 Q34 11 37 12" strokeWidth="2" strokeLinecap="round" />
      {/* Pedal crank */}
      <circle cx="22" cy="32" r="2.5" strokeWidth="1.75" />
      <line x1="19.5" y1="33.5" x2="17" y2="35" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="24.5" y1="30.5" x2="27" y2="29" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

// ⛵ Ūdens transports — motorboat side view
export function IconUdensTransports({ className }: IconProps) {
  return (
    <svg {...vBase} className={className}>
      {/* Hull */}
      <path d="M4 28 Q6 36 12 37 L38 37 Q43 37 45 33 L45 28Z" strokeWidth="2" />
      {/* Deck line */}
      <line x1="4" y1="28" x2="45" y2="28" strokeWidth="1.5" opacity="0.5" />
      {/* Cabin */}
      <path d="M14 28 L14 20 Q14 18 16 18 L32 18 Q34 18 34 20 L34 28Z" strokeWidth="1.75" />
      {/* Cabin windows */}
      <rect x="17" y="20" width="5" height="4" rx="1" strokeWidth="1.5" />
      <rect x="26" y="20" width="5" height="4" rx="1" strokeWidth="1.5" />
      {/* Mast / antenna */}
      <line x1="24" y1="18" x2="24" y2="10" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="24" y1="11" x2="30" y2="14" strokeWidth="1.25" strokeLinecap="round" opacity="0.6" />
      {/* Bow */}
      <path d="M4 28 Q3 28 2 31 Q3 34 4 28" strokeWidth="1.5" />
      {/* Engine */}
      <path d="M42 33 L46 30 Q47 28 46 26 L44 27" strokeWidth="1.75" strokeLinecap="round" />
      {/* Water waves */}
      <path d="M2 39 Q8 37 14 39 Q20 41 26 39 Q32 37 38 39 Q44 41 48 39" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

// ⚙️ Rezerves daļas un piederumi — car wheel + wrench
export function IconRezervesDalas({ className }: IconProps) {
  return (
    <svg {...vBase} className={className}>
      {/* Tire */}
      <circle cx="20" cy="26" r="16" strokeWidth="2.25" />
      <circle cx="20" cy="26" r="10" strokeWidth="1.75" />
      {/* Rim spokes */}
      <line x1="20" y1="16" x2="20" y2="36" strokeWidth="1.5" opacity="0.6" />
      <line x1="10" y1="26" x2="30" y2="26" strokeWidth="1.5" opacity="0.6" />
      <line x1="13" y1="19" x2="27" y2="33" strokeWidth="1.5" opacity="0.6" />
      <line x1="27" y1="19" x2="13" y2="33" strokeWidth="1.5" opacity="0.6" />
      {/* Center hub */}
      <circle cx="20" cy="26" r="3" strokeWidth="1.75" />
      {/* Wrench — overlapping top-right */}
      <path d="M32 6 Q38 4 40 10 Q38 10 36 12 L30 18 Q28 20 26 18 Q24 16 26 14 L32 8 Q34 6 32 6Z" strokeWidth="1.75" />
      <circle cx="28" cy="16" r="2" strokeWidth="1.5" />
    </svg>
  );
}

// ─── Transport Subcategory Icon Map ──────────────────────────────────────────

export const TRANSPORT_SUBCAT_ICONS: Record<string, React.ComponentType<IconProps>> = {
  'Vieglie auto':              IconVieglieAuto,
  'Motocikli un kvadricikli':  IconMotocikli,
  'Kravas auto un tehnika':    IconKravAsAuto,
  'Velosipēdi un skrejriteņi': IconVelosipedi,
  'Ūdens transports':          IconUdensTransports,
  'Rezerves daļas un piederumi': IconRezervesDalas,
};
