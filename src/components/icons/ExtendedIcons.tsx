import React from 'react';
import {
  Home, Building2, Trees, Store, Warehouse,
  Smartphone, Laptop, Tv, Gamepad2, Camera,
  Briefcase, UserSearch, Wrench, GraduationCap,
  Sofa, Hammer, Droplets, Leaf,
  Shirt, Footprints, Gem, Smile,
  Baby, Puzzle, Target,
  Dumbbell, Music, Book, Dog, Cat, Fish, MoreHorizontal
} from 'lucide-react';

export type CategoryIconProps = React.SVGProps<SVGSVGElement>;

// Helper for custom Lucide-styled icons
const createCustomIcon = (paths: React.ReactNode, name: string) => {
  const Icon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
    ({ color = "currentColor", width = 24, height = 24, strokeWidth = 2, className, ...props }, ref) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {paths}
      </svg>
    )
  );
  Icon.displayName = name;
  return Icon;
};

// Custom SVGs for missing specific Latvian categories to perfectly match image semantics
export const WashingMachineIcon = createCustomIcon(
  <>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M4 8h16" />
    <circle cx="12" cy="14" r="4" />
    <path d="M8 5.5h.01M10 5.5h.01" />
  </>,
  'WashingMachineIcon'
);

export const DressIcon = createCustomIcon(
  <>
    {/* Elegant dress silhouette with scoop neck, fitted waist, and flared skirt */}
    <path d="M 9 2 L 5 6 C 4.5 8.5 7 10.5 8 12 L 4 21 C 8 22.5 16 22.5 20 21 L 16 12 C 17 10.5 19.5 8.5 19 6 L 15 2 Q 12 5 9 2 Z" />
    {/* Waistline cinch */}
    <path d="M 8 12 H 16" />
    {/* Fabric flow lines for the flared skirt */}
    <path d="M 10.5 12 L 8.5 20" />
    <path d="M 13.5 12 L 15.5 20" />
  </>,
  'DressIcon'
);

export const BabyBottleIcon = createCustomIcon(
  <>
    <path d="M10 2v3" />
    <path d="M14 2v3" />
    <path d="M10 5h4v3c0 1-1 3-1 3v9a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2v-9c0 0-1-2-1-3V5Z" />
    <path d="M9 14h6" />
    <path d="M9 10h6" />
    <path d="M10 2h4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1Z" />
  </>,
  'BabyBottleIcon'
);

export const StrollerIcon = createCustomIcon(
  <>
    <path d="M10 21h.01M16 21h.01" />
    <path d="M3 4h3l3 13h10" />
    <path d="M9 17l1.5-6h7.2a2 2 0 0 0 1.9-2.6L18 4H7" />
    <path d="M14 4v5" />
  </>,
  'StrollerIcon'
);

export const CowIcon = createCustomIcon(
  <>
    {/* Snout - wide pill shape */}
    <rect x="5" y="14" width="14" height="7" rx="3.5" />
    
    {/* Upper Face / Head Frame */}
    <path d="M 7.5 14 V 9.5 A 1.5 1.5 0 0 1 9 8 H 15 A 1.5 1.5 0 0 1 16.5 9.5 V 14" />
    
    {/* Horns */}
    <path d="M 9 8 C 7 7 6 5 5 3" />
    <path d="M 15 8 C 17 7 18 5 19 3" />
    
    {/* Ears (droopy leaf shape) */}
    <path d="M 7.5 10.5 C 3 9 2 13 7.5 13" />
    <path d="M 16.5 10.5 C 21 9 22 13 16.5 13" />
    
    {/* Eyes */}
    <circle cx="10" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="14" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
    
    {/* Nostrils */}
    <path d="M 9 17.5 L 10 17.5" />
    <path d="M 14 17.5 L 15 17.5" />
  </>,
  'CowIcon'
);

export const DogIcon = createCustomIcon(
  <>
    {/* Outer Silhouette: Left Ear -> Dome -> Right Ear */}
    <path d="M 7.5 16 C 3.5 19.5 0.5 16 1.5 10 C 2 5.5 4 4.5 6.5 4 Q 12 1.5 17.5 4 C 20 4.5 22 5.5 22.5 10 C 23.5 16 20.5 19.5 16.5 16" />
    
    {/* Inner Face / Neck Lines */}
    <path d="M 6.5 4 C 9 9 9 15 6.5 19 L 5 22" />
    <path d="M 17.5 4 C 15 9 15 15 17.5 19 L 19 22" />
    
    {/* Nose */}
    <rect x="10.2" y="12" width="3.6" height="2.4" rx="1.2" fill="currentColor" stroke="none" />
    
    {/* Mouth/Jowls */}
    <path d="M 12 14.4 V 16.5" />
    <path d="M 9.5 15.5 Q 10.75 18 12 16.5 Q 13.25 18 14.5 15.5" />
    
    {/* Chin */}
    <path d="M 10.5 17.5 Q 12 19 13.5 17.5" />
    
    {/* Eyes */}
    <circle cx="9" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
  </>,
  'DogIcon'
);

export const PetFoodBagIcon = createCustomIcon(
  <>
    {/* Main Bag Outline */}
    <path d="M 7.5 2 L 6 7 L 4.5 19.5 A 2 2 0 0 0 6.5 22 H 17.5 A 2 2 0 0 0 19.5 19.5 L 18 7 L 16.5 2 Z" />
    
    {/* Top Seal Horizontal Line */}
    <path d="M 5.5 7 H 18.5" />
    
    {/* Top Seal Vertical Ribs */}
    <path d="M 9.5 2 V 7" />
    <path d="M 14.5 2 V 7" />
    
    {/* Paw Print Logo on the Bag (Solid) */}
    <path d="M 12 18 C 9.5 18 8.5 16 8.5 15 C 8.5 13.5 10.5 13 12 13 C 13.5 13 15.5 13.5 15.5 15 C 15.5 16 14.5 18 12 18 Z" fill="currentColor" stroke="none" />
    <circle cx="8" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="10.5" cy="10" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="10" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12" r="1.1" fill="currentColor" stroke="none" />
  </>,
  'PetFoodBagIcon'
);

export const TentAndRodIcon = createCustomIcon(
  <>
    {/* Ground */}
    <path d="M 2 20 H 22" />
    
    {/* Tent */}
    <path d="M 8 20 L 14.5 7 L 21 20" />
    <path d="M 14.5 7 V 14 L 11 20" />
    <path d="M 14.5 14 L 18 20" />

    {/* Fishing Rod Pole */}
    <path d="M 2.5 20 L 4 14 C 5 5 10 3 19 3" />
    
    {/* Fishing Reel */}
    <circle cx="4.5" cy="15.5" r="1.5" />
    <path d="M 4.5 15.5 L 6 17" />

    {/* Line, Hook, Barb */}
    <path d="M 19 3 V 9" />
    <path d="M 19 9 A 1.5 1.5 0 0 0 22 9 V 7.5 L 21.2 8.5" />
  </>,
  'TentAndRodIcon'
);

export const StampAndLoupeIcon = createCustomIcon(
  <>
    <mask id="stamp-loupe-mask">
      <rect x="-5" y="-5" width="34" height="34" fill="white" stroke="none" />
      <circle cx="15.5" cy="15.5" r="7" fill="black" stroke="none" />
    </mask>

    {/* The Stamp (Masked out where the loupe overlaps) */}
    <g mask="url(#stamp-loupe-mask)">
      {/* Outer edge of the stamp */}
      <rect x="3" y="2" width="13" height="16" rx="1.5" />
      
      {/* Inner picture frame */}
      <rect x="5.5" y="4.5" width="8" height="11" />
      
      {/* Stamp Art: Solid Mountain and Sun */}
      <path d="M 5.5 15.5 L 8.5 11 L 10.5 13 L 12 11.5 L 13.5 13 V 15.5 Z" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7" r="1.1" fill="currentColor" stroke="none" />

      {/* Postmark Squiggles over the top edge */}
      <path d="M 1 4 Q 2.5 2 4 4 T 7 4 T 10 4" />
    </g>
    
    {/* The Loupe / Magnifying Glass */}
    <circle cx="15.5" cy="15.5" r="5.5" />
    
    {/* Glass glare arc */}
    <path d="M 13.5 12.5 A 3 3 0 0 1 16.5 11.5" />
    
    {/* Loupe Handle */}
    <path d="M 19.3 19.4 L 22.5 22.5" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Handle Collar */}
    <path d="M 18.2 20.6 L 20.6 18.2" strokeWidth="1.5" strokeLinecap="round" />
  </>,
  'StampAndLoupeIcon'
);

export const TurntableHeadphonesIcon = createCustomIcon(
  <>
    {/* Turntable Chassis */}
    <rect x="5" y="12" width="14" height="10" rx="1.5" />
    
    {/* Chassis Feet */}
    <path d="M 8 22 V 23" />
    <path d="M 16 22 V 23" />

    {/* Vinyl Record */}
    <circle cx="10.5" cy="17" r="3.5" />
    <circle cx="10.5" cy="17" r="1.2" />
    <circle cx="10.5" cy="17" r="0.5" fill="currentColor" stroke="none" />

    {/* Tonearm */}
    <circle cx="16" cy="14" r="1" />
    <path d="M 16 15 L 14.5 18.5 L 13.3 19" strokeLinecap="round" strokeLinejoin="round" />

    {/* Headphones: Left Earcup clamping the chassis */}
    <path d="M 5 9 V 17" />
    <path d="M 5 10 H 3.5 A 2.5 2.5 0 0 0 1 12.5 V 13.5 A 2.5 2.5 0 0 0 3.5 16 H 5" />

    {/* Headphones: Right Earcup clamping the chassis */}
    <path d="M 19 9 V 17" />
    <path d="M 19 10 H 20.5 A 2.5 2.5 0 0 1 23 12.5 V 13.5 A 2.5 2.5 0 0 1 20.5 16 H 19" />

    {/* Headphones: Headband */}
    {/* Outer Arc */}
    <path d="M 2 11.5 C 2 3 22 3 22 11.5" />
    {/* Inner Arc/Cushion */}
    <path d="M 5 9 C 5 4.5 19 4.5 19 9" />
  </>,
  'TurntableHeadphonesIcon'
);

export const ToiletFaucetIcon = createCustomIcon(
  <>
    <path d="M8 4v4" />
    <path d="M16 4v4" />
    <path d="M12 4v8" />
    <path d="M6 12h12v4a4 4 0 0 1-8 0v-4" />
    <path d="M12 16v4" />
  </>,
  'ToiletFaucetIcon'
);


export const CommercialSpaceIcon = createCustomIcon(
  <>
    {/* Base line to ground both buildings */}
    <path d="M2 21h20" />
    
    {/* Office Tower (representing corporate/office spaces) */}
    <path d="M13 21V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v16" />
    <path d="M15 7h2" />
    <path d="M15 11h2" />
    <path d="M15 15h2" />
    
    {/* Warehouse/Factory Unit with Sawtooth Roof (representing industrial/retail spaces) */}
    <path d="M4 21V11l4-4 3 3 2-2" />
    
    {/* Warehouse Garage/Loading Door */}
    <path d="M6 21v-5h4v5" />
    <path d="M6 18h4" />
  </>,
  'CommercialSpaceIcon'
);

export const CustomServicesIcon = createCustomIcon(
  <>
    {/* The professional's toolbox body */}
    <rect x="3" y="10" width="18" height="11" rx="2" />
    
    {/* Sturdy grip handle */}
    <path d="M8 10V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
    
    {/* Lid separator */}
    <path d="M3 15h18" />
    
    {/* Locking latches */}
    <rect x="7" y="13" width="2" height="4" rx="1" />
    <rect x="15" y="13" width="2" height="4" rx="1" />
  </>,
  'CustomServicesIcon'
);

// --- 1. Nekustamais īpašums (5) ---
export const NIDzivokliIcon = Building2;
export const NIMajasIcon = Home;
export const NIZemeIcon = Trees;
export const NIKomerctelpasIcon = CommercialSpaceIcon;
export const NIGarazasIcon = Warehouse;

// --- 2. Elektronika (5) ---
export const ElMobilieIcon = Smartphone;
export const ElDatoriIcon = Laptop;
export const ElSadzivesIcon = WashingMachineIcon;
export const ElAudioVideoIcon = Camera; // Audio, Video, Foto
export const ElSpeluIcon = Gamepad2;

// --- 3. Darbs un pakalpojumi (4) ---
export const DpVakancesIcon = Briefcase;
export const DpMekleDarbuIcon = UserSearch;
export const DpPakalpojumiIcon = CustomServicesIcon;
export const DpKursiIcon = GraduationCap;

// --- 4. Mājai un dārzam (4) ---
export const MdMebelesIcon = Sofa;
export const MdBuvmaterialiIcon = Hammer;
export const MdDarzamIcon = Leaf;
export const MdSantehnikaIcon = Droplets;

export const BeautyHealthIcon = createCustomIcon(
  <>
    {/* Lipstick Base */}
    <rect x="4" y="14" width="6" height="7" rx="1" />
    
    {/* Lipstick Inner Tube */}
    <path d="M5 14v-4h4v4" />
    
    {/* Lipstick Color Tip (slanted) */}
    <path d="M5.5 10V5.5L8.5 4v6z" />
    
    {/* Health/Beauty Cream Jar Lid */}
    <rect x="13" y="15" width="8" height="3" rx="1" />
    
    {/* Health/Beauty Cream Jar Body */}
    <path d="M14 18v1a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-1" />
    
    {/* Sparkle / Star (representing beauty and freshness) */}
    <path d="M17 3l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
  </>,
  'BeautyHealthIcon'
);

// --- 5. Mode un stils (5) ---
export const MsSieviesuIcon = DressIcon;
export const MsViriesuIcon = Shirt;
export const MsApaviIcon = Footprints;
export const MsAksesuariIcon = Gem;
export const MsSkaistumkopsanaIcon = BeautyHealthIcon;

export const BabyRomperIcon = createCustomIcon(
  <>
    {/* Main Bodysuit Outline - Enlarged and Flared Geometry */}
    <path d="M 8.5 2 C 8.5 6.5 15.5 6.5 15.5 2 L 21.5 5 L 19.5 9 L 16.5 8 L 17.5 16 C 17.5 21 14.5 22.5 12 22.5 C 9.5 22.5 6.5 21 6.5 16 L 7.5 8 L 4.5 9 L 2.5 5 Z" />
    
    {/* Inner Leg Seam Arcs */}
    <path d="M 6.5 16 C 9 18 10.5 21.5 12 22" />
    <path d="M 17.5 16 C 15 18 13.5 21.5 12 22" />
  </>,
  'BabyRomperIcon'
);

export const BabyFaceIcon = createCustomIcon(
  <>
    {/* Hair loop on top */}
    <path d="M 10.5 3.5 A 1.5 1.5 0 0 1 13.5 3.5" />
    
    {/* Head outline and ears (continuous path, radius expanded to 6) */}
    <path d="M 17.6 11 A 6 6 0 1 0 6.4 11 A 2.2 2.2 0 0 0 6.4 15 A 6 6 0 0 0 17.6 15 A 2.2 2.2 0 0 0 17.6 11 Z" />
    
    {/* Eyes (filled dots) */}
    <circle cx="8.8" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15.2" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
    
    {/* Pacifier Outer Ring */}
    <circle cx="12" cy="16" r="2.8" />
    
    {/* Pacifier Inner Dot */}
    <circle cx="12" cy="16" r="1.1" fill="currentColor" stroke="none" />
    
    {/* Baby Shoulders and Bib (widened to match proportions) */}
    <path d="M 2.5 23 C 2.5 18 5.5 17.5 8 17.5 C 8 22 16 22 16 17.5 C 18.5 17.5 21.5 18 21.5 23" />
  </>,
  'BabyFaceIcon'
);

export const BabyStrollerIcon = createCustomIcon(
  <>
    {/* Bowl and horizontal divider. Draws the bottom semi-circle and perfectly closes at the top. */}
    <path d="M 8 10 A 6.5 6.5 0 0 0 21 10 Z" />
    
    {/* Canopy (Hood) - vertical line going up from center, then perfect quarter circle down to right edge */}
    <path d="M 14.5 10 V 3.5 A 6.5 6.5 0 0 1 21 10" />
    
    {/* Sweeping Curved Handle */}
    <path d="M 8 10 C 3 10 3 3.5 9 3.5" />
    
    {/* Wheels */}
    <circle cx="11.5" cy="20" r="2.2" />
    <circle cx="17.5" cy="20" r="2.2" />
    
    {/* Connecting Struts (Inverted V shape spreading out to wheels) */}
    <path d="M 13.5 16.4 L 11.5 18" />
    <path d="M 15.5 16.4 L 17.5 18" />
  </>,
  'BabyStrollerIcon'
);

export const RockingHorseIcon = createCustomIcon(
  <>
    {/* Body Loop: Back, Saddle, Neck, Ear, Head, Front Leg, Inner Arch, Back Leg */}
    <path d="M 7 9.5 L 9 9.5 C 9 12.5 13 12.5 13 9.5 L 14.5 3.5 L 15.8 6 L 18.5 6 A 1.5 1.5 0 0 1 18.5 9 L 15.5 9 L 16.5 15.5 A 5 5 0 0 0 6.5 15.5 Z" />
    
    {/* Tail sweeping left and down */}
    <path d="M 7 9.5 Q 3 9.5 3 13.5" />
    
    {/* Floor Rocker curved base */}
    <path d="M 3 18.5 Q 11.5 22.5 20 18.5" />
  </>,
  'RockingHorseIcon'
);

// --- 6. Bērniem (4) ---
export const BrApgerbiIcon = BabyRomperIcon;
export const BrRotallietasIcon = RockingHorseIcon;
export const BrRatiniIcon = BabyStrollerIcon;
export const BrZidainuIcon = BabyFaceIcon;

// --- 7. Sports un hobiji (5) ---
export const ShSportaIcon = Dumbbell;
export const ShMedibasIcon = TentAndRodIcon;
export const ShMuzikasIcon = TurntableHeadphonesIcon;
export const ShGramatasIcon = Book;
export const ShKolekcionesanaIcon = StampAndLoupeIcon;

// --- 8. Dzīvnieki (4) ---
export const DzSuniIcon = DogIcon;
export const DzKakiIcon = Cat;
export const DzLauksaimniecibasIcon = CowIcon;
export const DzBaribaIcon = PetFoodBagIcon;

// --- 9. Cits (1) ---
export const CtDazadiIcon = MoreHorizontal;

export const ALL_EXTRA_ICONS = {
  // Nekustamais
  NIDzivokliIcon, NIMajasIcon, NIZemeIcon, NIKomerctelpasIcon, NIGarazasIcon,
  // Elektronika
  ElMobilieIcon, ElDatoriIcon, ElSadzivesIcon, ElAudioVideoIcon, ElSpeluIcon,
  // Darbs
  DpVakancesIcon, DpMekleDarbuIcon, DpPakalpojumiIcon, DpKursiIcon,
  // Maijai
  MdMebelesIcon, MdBuvmaterialiIcon, MdDarzamIcon, MdSantehnikaIcon,
  // Mode
  MsSieviesuIcon, MsViriesuIcon, MsApaviIcon, MsAksesuariIcon, MsSkaistumkopsanaIcon,
  // Berniem
  BrApgerbiIcon, BrRotallietasIcon, BrRatiniIcon, BrZidainuIcon,
  // Sports
  ShSportaIcon, ShMedibasIcon, ShMuzikasIcon, ShGramatasIcon, ShKolekcionesanaIcon,
  // Dzivnieki
  DzSuniIcon, DzKakiIcon, DzLauksaimniecibasIcon, DzBaribaIcon,
  // Cits
  CtDazadiIcon
};


export default ALL_EXTRA_ICONS;
