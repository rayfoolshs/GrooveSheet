/**
 * Paged handbook metadata for the in-app manual viewer.
 *
 * Page images are rendered from `public/GrooveSheet-User-Manual-A4.pdf`
 * (1200 × 1698 px JPEGs, one per PDF page).
 */

const pageImage = (page: number): string =>
  `${import.meta.env.BASE_URL}manual/page-${String(page).padStart(2, '0')}.jpg`;

export interface ManualPage {
  page: number;
  title: string;
  image: string;
}

export interface ManualChapterLink {
  number: string;
  label: string;
  page: number;
}

export const MANUAL_PAGES: ManualPage[] = [
  { page: 1, title: 'Cover & Application Details', image: pageImage(1) },
  { page: 2, title: 'Studio Overview & Workspace Anatomy', image: pageImage(2) },
  { page: 3, title: 'Transport, Meters, Subdivisions & Swing', image: pageImage(3) },
  { page: 4, title: 'Meter Reference & Counting', image: pageImage(4) },
  { page: 5, title: 'Interactive PAS Percussion Staff Engraving', image: pageImage(5) },
  { page: 6, title: 'Step Sequencer Matrix, Brushes & Track Mixer', image: pageImage(6) },
  { page: 7, title: 'Smart Drummer Studio', image: pageImage(7) },
  { page: 8, title: 'General MIDI, Custom SoundFonts & Web MIDI', image: pageImage(8) },
  { page: 9, title: 'Groove Library, Print Sheet Music & File I/O', image: pageImage(9) },
  { page: 10, title: 'Curated Groove Library & Presets', image: pageImage(10) },
  { page: 11, title: 'Real-Time Collaboration & Quick Reference', image: pageImage(11) },
  { page: 12, title: 'Server API & Endpoint Reference', image: pageImage(12) },
];

export const MANUAL_CHAPTER_LINKS: ManualChapterLink[] = [
  { number: '01', label: 'Cover', page: 1 },
  { number: '02', label: 'Studio Overview', page: 2 },
  { number: '03', label: 'Transport', page: 3 },
  { number: '04', label: 'PAS Staff', page: 5 },
  { number: '05', label: 'Step Sequencer', page: 6 },
  { number: '06', label: 'Smart Drummer', page: 7 },
  { number: '07', label: 'MIDI & SoundFonts', page: 8 },
  { number: '08', label: 'Library & Print', page: 9 },
  { number: '09', label: 'Collaboration', page: 11 },
];
