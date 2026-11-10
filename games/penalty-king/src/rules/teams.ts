/**
 * The eight invented teams (asset brief section 4; `assets/geometry.json` holds the same names, checked by a test).
 * `skill` (0..1) only drives the CPU-versus-CPU matches of the cup bracket.
 */
export const TEAM_IDS = [
  'lanterns',
  'sparks',
  'drifters',
  'comets',
  'harriers',
  'embers',
  'blazers',
  'bells',
] as const;
export type TeamId = (typeof TEAM_IDS)[number];

export interface Team {
  id: TeamId;
  name: string;
  short: string;
  skill: number;
  /** quarter-finals are on the community pitch, the semi-final and final in the stadium */
  you?: boolean;
}

export const TEAMS: readonly Team[] = [
  { id: 'lanterns', name: 'Lagoon Lanterns', short: 'LAG', skill: 0.5, you: true },
  { id: 'sparks', name: 'Sahel Sparks', short: 'SAH', skill: 0.4 },
  { id: 'drifters', name: 'Delta Drifters', short: 'DEL', skill: 0.5 },
  { id: 'comets', name: 'Capital Comets', short: 'CAP', skill: 0.6 },
  { id: 'harriers', name: 'Highland Harriers', short: 'HIG', skill: 0.55 },
  { id: 'embers', name: 'Eastern Embers', short: 'EAS', skill: 0.45 },
  { id: 'blazers', name: 'Basin Blazers', short: 'BAS', skill: 0.5 },
  { id: 'bells', name: 'Brass City Bells', short: 'BRA', skill: 0.65 },
];

export const teamById = (id: string): Team => TEAMS.find((t) => t.id === id) ?? (TEAMS[0] as Team);
export const isTeamId = (id: unknown): id is TeamId => TEAM_IDS.includes(id as TeamId);
export const YOU: TeamId = 'lanterns';
