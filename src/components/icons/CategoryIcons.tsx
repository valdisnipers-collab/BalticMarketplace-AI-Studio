import React from 'react';

export type CategoryIconProps = React.SVGProps<SVGSVGElement>;

const defaultProps: React.SVGProps<SVGSVGElement> = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 64 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const CarIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="16" cy="34" r="5" />
    <circle cx="16" cy="34" r="2" />
    <circle cx="48" cy="34" r="5" />
    <circle cx="48" cy="34" r="2" />
    <path d="M 21 34 H 43" />
    <path d="M 11 34 H 6 C 5 34 4 33 4 31 L 4 25 C 4 22 7 20 10 19 L 20 11 C 24 8 28 8 32 8 H 40 C 44 8 48 11 50 15 L 56 22 C 59 24 60 26 60 30 V 32 C 60 33 59 34 58 34 H 53" />
    <path d="M 24 18 L 30 10 H 40 C 42 10 44 11 45 13 L 51 19 H 24 Z" />
    <path d="M 36 10 V 19" />
  </svg>
);

export const MotorcycleIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="16" cy="34" r="6" />
    <circle cx="16" cy="34" r="2" />
    <circle cx="48" cy="34" r="6" />
    <circle cx="48" cy="34" r="2" />
    <path d="M 16 34 L 26 22 H 38" />
    <path d="M 48 34 L 40 22 L 46 12 C 43 14 38 16 34 16 C 30 16 26 18 20 18" />
    <path d="M 20 18 C 16 18 10 20 10 20 L 16 24" />
    <path d="M 46 12 C 48 10 50 12 52 16 L 48 24" />
    <path d="M 40 18 C 42 16 46 14 48 16" />
  </svg>
);

export const EBikeIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="14" cy="34" r="7" />
    <circle cx="42" cy="34" r="7" />
    <circle cx="28" cy="34" r="2" />
    <path d="M 14 34 L 28 34 L 22 20 Z" />
    <path d="M 28 34 L 36 20 L 42 34" />
    <path d="M 22 20 H 36" />
    <path d="M 20 14 L 24 24" />
    <path d="M 16 14 H 24" />
    <path d="M 36 20 L 34 12 H 40" />
    {/* Lightning Bolt */}
    <path d="M 54 10 L 48 18 H 56 L 50 28" fill="currentColor" stroke="none" />
  </svg>
);

export const CamperIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="18" cy="36" r="4" />
    <circle cx="18" cy="36" r="1.5" />
    <circle cx="46" cy="36" r="4" />
    <circle cx="46" cy="36" r="1.5" />
    <path d="M 14 36 H 6 C 5 36 4 35 4 34 V 12 C 4 10 6 8 8 8 H 40 C 42 8 44 9 45 11 L 46 16 L 54 22 C 58 24 60 26 60 30 V 34 C 60 35 59 36 58 36 H 50 M 22 36 H 42" />
    <path d="M 42 8 C 46 8 50 12 50 16 V 22" />
    <rect x="12" y="14" width="10" height="8" rx="2" />
    <rect x="26" y="14" width="8" height="14" rx="1" />
    <path d="M 46 22 L 52 26 V 30 H 46 Z" />
  </svg>
);

export const TruckLargeIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="16" cy="36" r="5" />
    <circle cx="48" cy="36" r="5" />
    <path d="M 11 36 H 43" />
    <path d="M 36 36 H 6 C 5 36 4 35 4 34 V 10 C 4 9 5 8 6 8 H 36 C 37 8 38 9 38 10 V 36" />
    <path d="M 38 18 H 50 C 53 18 56 20 58 24 L 60 28 C 60 32 60 34 58 35 C 57 36 55 36 53 36 M 38 36 H 43" />
    <path d="M 46 20 H 52 L 55 26 H 46 Z" />
  </svg>
);

export const TrailerBoxIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="24" cy="36" r="4" />
    <circle cx="34" cy="36" r="4" />
    <rect x="4" y="16" width="44" height="20" rx="2" />
    <path d="M 48 30 H 58 C 59 30 60 31 60 32 V 36" />
    <path d="M 54 36 H 60" />
  </svg>
);

export const VanIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="18" cy="36" r="5" />
    <circle cx="48" cy="36" r="5" />
    <path d="M 13 36 H 6 C 5 36 4 35 4 34 V 14 C 4 12 6 10 8 10 H 38 C 40 10 42 11 44 13 L 52 20 C 56 22 58 24 58 28 V 34 C 58 35 57 36 56 36 H 53 M 23 36 H 43" />
    <path d="M 38 12 L 48 20 H 54" />
    <path d="M 44 20 H 30 V 12" />
  </svg>
);

export const SemiTractorIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="20" cy="36" r="5" />
    <circle cx="32" cy="36" r="5" />
    <circle cx="50" cy="36" r="5" />
    <path d="M 8 36 H 15 M 25 36 H 27 M 37 36 H 45" />
    <path d="M 12 36 V 32 H 58 V 36" />
    <path d="M 14 32 V 28 H 22" />
    <path d="M 32 32 V 12 C 32 10 34 8 36 8 H 42 C 44 8 46 9 48 11 L 54 18 C 57 20 58 22 58 26 V 32" />
    <path d="M 32 12 H 44 L 50 18 H 32" />
    <path d="M 30 8 V 32" />
    <path d="M 28 6 V 26" strokeWidth="3" />
  </svg>
);

export const SemiTrailerIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="14" cy="36" r="4" />
    <circle cx="24" cy="36" r="4" />
    <circle cx="34" cy="36" r="4" />
    <path d="M 4 8 H 56 C 58 8 60 10 60 12 V 28 C 60 29 59 30 58 30 H 48 V 36 M 10 36 H 4 M 18 36 H 20 M 28 36 H 30 M 38 36 H 44 V 30 H 4" />
    <path d="M 4 8 V 30" />
    <path d="M 48 30 V 36 H 52 V 30" />
  </svg>
);

export const BusIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="16" cy="36" r="4" />
    <circle cx="16" cy="36" r="1.5" />
    <circle cx="48" cy="36" r="4" />
    <circle cx="48" cy="36" r="1.5" />
    <path d="M 12 36 H 8 C 6 36 4 34 4 32 V 16 C 4 13 6 10 10 10 H 54 C 58 10 60 13 60 16 V 32 C 60 34 58 36 56 36 H 52 M 20 36 H 44" />
    <path d="M 4 20 H 60" />
    <rect x="8" y="12" width="6" height="8" rx="1" />
    <rect x="16" y="12" width="6" height="8" rx="1" />
    <rect x="24" y="12" width="6" height="8" rx="1" />
    <rect x="32" y="12" width="6" height="8" rx="1" />
    <rect x="40" y="12" width="6" height="8" rx="1" />
    <rect x="48" y="12" width="6" height="8" rx="1" />
  </svg>
);

export const TractorIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="22" cy="32" r="10" />
    <circle cx="22" cy="32" r="3" />
    <circle cx="50" cy="36" r="6" />
    <circle cx="50" cy="36" r="2" />
    <path d="M 32 32 H 44" />
    <path d="M 38 32 V 22 C 38 20 40 18 42 18 H 56 C 58 18 60 20 60 22 V 32 C 60 34 58 36 56 36" />
    <path d="M 42 18 V 6" strokeWidth="3" />
    <path d="M 40 6 H 44" />
    <path d="M 12 30 V 12 C 12 10 14 8 16 8 H 30 C 32 8 34 10 34 12 V 22 H 38" />
    <path d="M 14 10 H 32 V 20 H 14 Z" />
  </svg>
);

export const ExcavatorIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <rect x="12" y="32" width="24" height="8" rx="4" />
    <circle cx="16" cy="36" r="2" />
    <circle cx="24" cy="36" r="2" />
    <circle cx="32" cy="36" r="2" />
    <path d="M 18 32 V 16 C 18 14 20 12 22 12 H 30 C 32 12 34 14 34 16 V 32" />
    <rect x="22" y="14" width="10" height="10" rx="1" />
    <path d="M 34 26 L 46 16 L 56 26" strokeLinejoin="miter" />
    <path d="M 52 26 C 52 32 54 34 58 34 V 24 L 56 26" />
    <path d="M 58 34 C 60 34 62 32 62 30" />
  </svg>
);

export const ForkliftIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    <circle cx="20" cy="36" r="4" />
    <circle cx="38" cy="36" r="4" />
    <path d="M 12 36 H 16 M 24 36 H 34 M 42 36 H 44" />
    <path d="M 12 36 C 8 36 6 32 6 28 L 8 20 C 10 16 14 16 20 16 H 36 L 44 24 V 36" />
    <path d="M 16 20 V 8 C 16 6 18 4 20 4 H 30 C 32 4 34 6 34 8 V 16" />
    <path d="M 48 4 V 38" />
    <path d="M 46 38 H 60" />
    <path d="M 48 24 H 42" />
  </svg>
);

export const BoatIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    {/* Hull */}
    <path d="M 6 26 L 14 34 H 46 C 52 34 56 30 60 24 H 6 Z" />
    {/* Cabin */}
    <path d="M 20 24 V 16 C 20 14 22 12 24 12 H 36 C 40 12 44 16 46 20 L 48 24" />
    <rect x="24" y="16" width="8" height="4" rx="1" />
    <path d="M 36 16 H 40 L 42 20" />
    {/* Outboard Motor / Stern drive */}
    <path d="M 6 26 V 30 C 6 32 8 32 10 32" />
    {/* Water Waves */}
    <path d="M 2 42 C 8 40 12 44 18 42 C 24 40 28 44 34 42 C 40 40 44 44 50 42 C 56 40 60 42 62 40" />
  </svg>
);

export const PartsIcon = ({ className, ...props }: CategoryIconProps) => (
  <svg className={className} {...defaultProps} {...props}>
    {/* Gear on Left */}
    <circle cx="20" cy="24" r="6" />
    <path d="M 20 14 V 10 M 20 38 V 34 M 10 24 H 6 M 34 24 H 30 M 13 17 L 10 14 M 27 31 L 30 34 M 27 17 L 30 14 M 13 31 L 10 34" strokeWidth="2" strokeLinecap="round" />
    
    {/* Wrench crossing over the gear */}
    <path d="M 36 38 L 52 22" strokeWidth="4" />
    {/* Wrench head */}
    <path d="M 52 22 C 50 18 50 14 54 12 C 58 10 62 12 64 16 L 60 18 L 58 20 L 62 24 C 58 26 54 26 52 22 Z" strokeLinejoin="round" />
    <path d="M 36 38 C 34 40 30 40 28 38 C 26 36 26 32 28 30 L 32 26" />
  </svg>
);

export default {
  CarIcon,
  MotorcycleIcon,
  EBikeIcon,
  CamperIcon,
  TruckLargeIcon,
  TrailerBoxIcon,
  VanIcon,
  SemiTractorIcon,
  SemiTrailerIcon,
  BusIcon,
  TractorIcon,
  ExcavatorIcon,
  ForkliftIcon,
  BoatIcon,
  PartsIcon
};
