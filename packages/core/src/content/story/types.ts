/**
 * Story-content types (Akọni & Dike, reusable by any narrative game). Plain JSON documents that are
 * validated at build time (`content:check`) and again at run time when a chapter pack is loaded.
 * Reuses `PackLang`, `QuizQuestion` and `ValidationResult` from the quiz/word pack types.
 */
import type { PackLang, QuizQuestion } from '../types';

export type Campaign = 'kiriji' | 'ekumeku' | 'moremi-prologue';
/** Every cutscene panel, character card and learning item carries one of these badges. */
export type ContentTag = 'History' | 'Legend' | 'Story';
export type HeroMomentType = 'brawl' | 'duel' | 'aim' | 'chase' | 'rhythm' | 'stealth' | 'escape';
export type ObjectiveKind =
  | 'escort'
  | 'defend'
  | 'hold'
  | 'raid'
  | 'stealth'
  | 'ambush'
  | 'relay'
  | 'protect'
  | 'choice'
  | 'cut'
  | 'survive';
export type ChapterDelivery = 'initial' | 'pack';
export type TwoSidesBasis = 'oral' | 'written' | 'official-report' | 'tradition';
export type CodexShelf = 'documents' | 'books' | 'objects' | 'oral-history';
export type PinKind = 'timeline' | 'map' | 'both';

/** English is required; Pidgin ships from day one; yo/ig/ha are added later with native review. */
export type LocalizedText = { en: string } & Partial<Record<Exclude<PackLang, 'en'>, string>>;

/** Fields EVERY learning item carries. `reviewed:false` blocks a release build. */
export interface Reviewable {
  /** Where the fact was checked (book, museum object, SCRIPT.md / LEARNING.md, "TODO historian"). */
  source: string;
  /** Who signed it off, or the placeholder naming the role still to do it. */
  reviewedBy: string;
  reviewed: boolean;
}

export interface HistDate {
  year: number;
  month?: number;
  day?: number;
}
export interface DateRange {
  start: HistDate;
  end?: HistDate;
  /** "c. 1880": the sources give no exact year. */
  circa?: boolean;
  /** Shown in the codex where historians disagree (e.g. Kiriji ends 1886 or 1893). */
  sourcesDisagree?: string;
}

export interface BattleObjective {
  id: string;
  kind: ObjectiveKind;
  text: LocalizedText;
  /** Target count or seconds, where the objective has one (escort 6, hold 180 s). */
  amount?: number;
}

export interface ChapterContentIds {
  scenes: string[];
  facts: string[];
  sources: string[];
  twoSides: string[];
  pins: string[];
  checks: string[];
}

export interface ChapterManifest extends Reviewable {
  version: 1;
  kind: 'chapter';
  id: string;
  campaign: Campaign;
  /** Play order inside the campaign: unique, 0 for a prologue. */
  order: number;
  title: LocalizedText;
  tag: ContentTag;
  /** 1 to 4 things the player should learn (LEARNING.md "Lesson per chapter"). */
  goals: LocalizedText[];
  /** Asset-bible environment id, e.g. `oke-imesi-town`. */
  environment: string;
  hero: string;
  companions: string[];
  /** Extra named speakers (cameos such as `ogedengbe`). */
  cast?: string[];
  objectives: BattleObjective[];
  heroMoment: { type: HeroMomentType; text: LocalizedText };
  dates: DateRange;
  /** Chapter ids that must be completed first (same campaign). */
  dependencies: string[];
  /** `initial` ships in the 3 MB first download, `pack` is a <= 1 MB on-demand chapter pack. */
  delivery: ChapterDelivery;
  /** `chNN`: the `packs/chNN/` folder declared in games/akoni-dike/packs.json. Required for `pack`. */
  pack?: string;
  /** Per-chapter gzip budget in KB (1..1024). Required for `pack`, forbidden for `initial`. */
  packBudgetKb?: number;
  /** Feature flag that must be on for the chapter to ship (the Moremi prologue: `moremiPrologue`). */
  featureFlag?: string;
  content: ChapterContentIds;
}

export interface DialogueLine {
  id: string;
  /** `narrator`, `guide`, or a character id from the chapter's hero, companions or cast. */
  speaker: string;
  text: LocalizedText;
  /** Languages that appear in the line (an English line with a Yoruba proverb: `['en','yo']`). */
  langs: PackLang[];
  /** Glossary term ids used in the line (tappable). */
  glossary?: string[];
  /** Awaiting a native speaker. Required (true or false) when `langs` has yo, ig or ha. */
  native_review?: boolean;
  /** Required `true` when the speaker is a real person: the words are invented. */
  fictional?: boolean;
  tag?: ContentTag;
}
export interface DialogueScene {
  id: string;
  tag: ContentTag;
  lines: DialogueLine[];
}
export interface DialoguePack {
  version: 1;
  kind: 'dialogue';
  id: string;
  campaign: Campaign;
  chapter: string;
  scenes: DialogueScene[];
}

export interface FactCard extends Reviewable {
  id: string;
  /** Trigger id the engine fires (`hill-taken`, `river-crossed`). */
  trigger: string;
  /** Each language <= 140 characters. */
  text: LocalizedText;
  tag: ContentTag;
  /** Optional id of a source card in the same chapter. */
  sourceRef?: string;
}
export interface SourceCard extends Reviewable {
  id: string;
  title: string;
  /** Who wrote it. */
  author: string;
  /** When (free text: "1886", "1921", "c. 1880"). */
  when: string;
  /** Why it matters. */
  why: LocalizedText;
  citation: string;
  /** Optional short quotation, shown with the citation. */
  quote?: string;
  codex: { shelf: CodexShelf; slot: number };
  tag: ContentTag;
}
export interface TwoSidesEntry extends Reviewable {
  id: string;
  event: LocalizedText;
  sides: Array<{ id: string; label: string; account: LocalizedText; basis: TwoSidesBasis }>;
  tag: ContentTag;
}
export interface MapPin extends Reviewable {
  id: string;
  kind: PinKind;
  label: LocalizedText;
  date: DateRange;
  /** Map position, 0..1 of the Nigeria map image. Required for `map` and `both`. */
  place?: { name: string; x: number; y: number };
  tag: ContentTag;
}
/** A knowledge-check item: a `QuizQuestion` (so `@naija/core/quiz` can run it) plus the lesson. */
export interface KnowledgeCheckItem extends QuizQuestion {
  /** The correct fact, shown after a wrong answer. Never blocks progress. */
  explanation: string;
  reviewedBy: string;
}
export interface LearningPack {
  version: 1;
  kind: 'learning';
  id: string;
  campaign: Campaign;
  chapter: string;
  facts: FactCard[];
  sources: SourceCard[];
  twoSides: TwoSidesEntry[];
  pins: MapPin[];
  checks: KnowledgeCheckItem[];
}

export interface GlossaryTerm extends Reviewable {
  id: string;
  /** Display form WITH diacritics (`Ọ̀yọ́`, `ọgẹ̀nẹ̀`). */
  term: string;
  language: PackLang;
  definition: LocalizedText;
  /** True once a native speaker (or the project's diacritics list) confirmed the marks. */
  diacriticChecked: boolean;
}
export interface GlossaryPack {
  version: 1;
  kind: 'glossary';
  id: string;
  /** `shared` terms (ogene, Saro) may be used by every campaign. */
  campaign: Campaign | 'shared';
  terms: GlossaryTerm[];
}

export type StoryDoc = ChapterManifest | DialoguePack | LearningPack | GlossaryPack;

/** Games ask `isFeatureOn(features, 'moremiPrologue')`; unknown flags are off. */
export interface FeatureConfig {
  version: 1;
  features: Record<string, boolean>;
}

export interface CampaignBundle {
  chapters: ChapterManifest[];
  dialogue: DialoguePack[];
  learning: LearningPack[];
  glossary: GlossaryPack[];
}

export type Severity = 'error' | 'warning';
export interface Finding {
  severity: Severity;
  /** Stable rule id (`guardrail/blood`, `xref/glossary`). */
  rule: string;
  /** JSON-path style location, prefixed with the document id. */
  at: string;
  message: string;
}
