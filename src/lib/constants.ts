import {
  CircleDot,
  Cog,
  Disc,
  Gauge,
  Shield,
  Wrench,
  Wind
} from 'lucide-react';

export const PART_CATEGORIES = [
  {
    id: 'Engine',
    label: 'Engine',
    description: 'Blocks, heads, turbos, and intake components.',
    Icon: Gauge
  },
  {
    id: 'Suspension',
    label: 'Suspension',
    description: 'Coilovers, shocks, arms, and handling parts.',
    Icon: Disc
  },
  {
    id: 'Transmission',
    label: 'Transmission',
    description: 'Gearboxes, clutches, and driveline hardware.',
    Icon: Cog
  },
  {
    id: 'Brakes',
    label: 'Brakes',
    description: 'Pads, rotors, calipers, and brake kits.',
    Icon: Shield
  },
  {
    id: 'Rims',
    label: 'Rims',
    description: 'Wheels, fitment, and offset-sensitive setups.',
    Icon: CircleDot
  },
  {
    id: 'Tires',
    label: 'Tires',
    description: 'Street and track tires with age/wear risk.',
    Icon: Wind
  },
  {
    id: 'Exhaust',
    label: 'Exhaust',
    description: 'Headers, downpipes, and cat-back systems.',
    Icon: Wrench
  }
] as const;

export const PART_CONDITIONS = ['New', 'Used', 'Aftermarket'] as const;
export const MARKET_SOURCES = ['Facebook Marketplace'] as const;

export type PartCategory = (typeof PART_CATEGORIES)[number]['id'];
export type PartCondition = (typeof PART_CONDITIONS)[number];
export type MarketSource = (typeof MARKET_SOURCES)[number];
