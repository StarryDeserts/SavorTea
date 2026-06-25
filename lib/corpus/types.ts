export interface CorpusItemBlock {
  type?: string;
  url?: string;
  audio?: string;
}

export interface CorpusItem {
  data?: string;
  note?: {
    meaning?: string[];
    context?: {
      '粤语文本'?: string;
      audio?: string;
    };
  };
  structured_note?: {
    jyutping?: string;
    data?: { blocks?: CorpusItemBlock[] }[];
  };
}

export interface CorpusCard {
  uuid: string;
  yueText: string;
  meanings: string[];
  contextText?: string;
  contextAudio?: string;
  jyutping?: string;
  audioUrl?: string;
}
