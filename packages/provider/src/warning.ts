export type TTSWarning = {
  type: 'unsupported' | 'other';
  feature: string;
  details: string;
};
