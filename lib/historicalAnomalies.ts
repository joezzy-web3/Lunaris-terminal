export const HISTORICAL_DISCLOSED_ANOMALY_IDS = [
  'PT-20260917-0300', 'PT-20260917-0301', 'PT-20260917-0850', 'PT-20260917-0865',
  'PT-20260917-0804', 'PT-20260917-1375', 'PT-20260918-2270', 'PT-20260918-2369',
  'PT-20260918-2557', 'PT-20260918-4317', 'PT-20260918-4342', 'PT-20260918-4343',
  'PT-20260918-4354', 'PT-20260918-4369', 'PT-20260918-4379', 'PT-20260918-4391',
  'PT-20260918-4410', 'PT-20260918-4420', 'PT-20260918-4424', 'PT-20260919-5875',
  'PT-20260919-5891', 'PT-20260919-5893', 'PT-20260919-5895', 'PT-20260919-5903',
  'PT-20260919-5908', 'PT-20260919-5959', 'PT-20260919-5962', 'PT-20260919-5977',
  'PT-20260919-5985', 'PT-20260919-5986', 'PT-20260919-5993', 'PT-20260919-6000',
  'PT-20260919-6010', 'PT-20260919-6012', 'PT-20260919-6019', 'PT-20260919-6027',
  'PT-20260919-6034', 'PT-20260919-6050', 'PT-20260919-6052', 'PT-20260919-6057',
  'PT-20260919-6058', 'PT-20260919-6182', 'PT-20260919-6189', 'PT-20260919-6198',
  'PT-20260919-6215'
] as const;

export const HISTORICAL_DISCLOSED_ANOMALY_SET = new Set<string>(HISTORICAL_DISCLOSED_ANOMALY_IDS);

export interface HistoricalDuplicateGroup {
  signature: string;
  instrument: string;
  entryPrice: number;
  exitPrice: number;
  netPnl: number;
  tradeIds: string[];
}

export const HISTORICAL_DUPLICATE_GROUPS: HistoricalDuplicateGroup[] = [
  { signature: 'TSLA/USDT|248|246.18|-220', instrument: 'TSLA/USDT', entryPrice: 248, exitPrice: 246.18, netPnl: -220, tradeIds: ['PT-20260914-0016', 'PT-20260914-0058'] },
  { signature: 'BTC/USDT|78450|79992.85|590', instrument: 'BTC/USDT', entryPrice: 78450, exitPrice: 79992.85, netPnl: 590, tradeIds: ['PT-20260914-0045', 'PT-20260914-0197'] },
  { signature: 'NVDAon/USDT|219.34|148.74|-192', instrument: 'NVDAon/USDT', entryPrice: 219.34, exitPrice: 148.74, netPnl: -192, tradeIds: ['PT-20260918-2270', 'PT-20260918-2369'] },
  { signature: 'MSTR/USDT|132.25|136.29|183.29', instrument: 'MSTR/USDT', entryPrice: 132.25, exitPrice: 136.29, netPnl: 183.29, tradeIds: ['PT-20260918-2295', 'PT-20260918-2329', 'PT-20260918-2828'] },
  { signature: 'TSLAon/USDT|366.2|377.62|187.11', instrument: 'TSLAon/USDT', entryPrice: 366.2, exitPrice: 377.62, netPnl: 187.11, tradeIds: ['PT-20260918-2327', 'PT-20260918-3050'] },
  { signature: 'TSLAon/USDT|242|322.26|390', instrument: 'TSLAon/USDT', entryPrice: 242, exitPrice: 322.26, netPnl: 390, tradeIds: ['PT-20260918-2332', 'PT-20260918-3290'] },
  { signature: 'SOL/USDT|105.79|109.16|191.13', instrument: 'SOL/USDT', entryPrice: 105.79, exitPrice: 109.16, netPnl: 191.13, tradeIds: ['PT-20260918-2345', 'PT-20260918-3039'] },
  { signature: 'NVDAon/USDT|219.34|226.88|206.26', instrument: 'NVDAon/USDT', entryPrice: 219.34, exitPrice: 226.88, netPnl: 206.26, tradeIds: ['PT-20260918-2361', 'PT-20260918-2964'] },
  { signature: 'SOL/USDT|105.67|109.04|191.35', instrument: 'SOL/USDT', entryPrice: 105.67, exitPrice: 109.04, netPnl: 191.35, tradeIds: ['PT-20260918-2475', 'PT-20260918-2551'] },
  { signature: 'NVDAon/USDT|219.34|226.23|188.47', instrument: 'NVDAon/USDT', entryPrice: 219.34, exitPrice: 226.23, netPnl: 188.47, tradeIds: ['PT-20260918-2555', 'PT-20260918-2806'] },
  { signature: 'MSTR/USDT|132.25|136.36|186.46', instrument: 'MSTR/USDT', entryPrice: 132.25, exitPrice: 136.36, netPnl: 186.46, tradeIds: ['PT-20260918-2620', 'PT-20260918-2945'] },
  { signature: 'MSTR/USDT|132.25|136.69|201.44', instrument: 'MSTR/USDT', entryPrice: 132.25, exitPrice: 136.69, netPnl: 201.44, tradeIds: ['PT-20260918-2645', 'PT-20260918-3312'] },
  { signature: 'NVDAon/USDT|219.34|226.38|192.58', instrument: 'NVDAon/USDT', entryPrice: 219.34, exitPrice: 226.38, netPnl: 192.58, tradeIds: ['PT-20260918-2739', 'PT-20260918-2861'] },
  { signature: 'TSLAon/USDT|366.2|379.97|225.61', instrument: 'TSLAon/USDT', entryPrice: 366.2, exitPrice: 379.97, netPnl: 225.61, tradeIds: ['PT-20260918-2768', 'PT-20260918-3021'] },
  { signature: 'MSTR/USDT|132.25|137.29|228.66', instrument: 'MSTR/USDT', entryPrice: 132.25, exitPrice: 137.29, netPnl: 228.66, tradeIds: ['PT-20260918-2834', 'PT-20260918-2990'] },
  { signature: 'MSTR/USDT|132.25|136.22|180.11', instrument: 'MSTR/USDT', entryPrice: 132.25, exitPrice: 136.22, netPnl: 180.11, tradeIds: ['PT-20260918-2933', 'PT-20260918-3093'] },
  { signature: 'MSTR/USDT|132.25|136.54|194.63', instrument: 'MSTR/USDT', entryPrice: 132.25, exitPrice: 136.54, netPnl: 194.63, tradeIds: ['PT-20260918-3062', 'PT-20260918-3206'] },
  { signature: 'PLTR/USDT|68.7|156.32|7625.9', instrument: 'PLTR/USDT', entryPrice: 68.7, exitPrice: 156.32, netPnl: 7625.9, tradeIds: ['PT-20260919-5893', 'PT-20260919-5962'] },
  { signature: 'PLTR/USDT|177.64|76.94|-10244.68', instrument: 'PLTR/USDT', entryPrice: 177.64, exitPrice: 76.94, netPnl: -10244.68, tradeIds: ['PT-20260919-5985', 'PT-20260919-6010'] },
  { signature: 'QQQ/USDT|721.45|551.04|-4292.59', instrument: 'QQQ/USDT', entryPrice: 721.45, exitPrice: 551.04, netPnl: -4292.59, tradeIds: ['PT-20260919-5986', 'PT-20260919-5993'] },
  { signature: 'MSTR/USDT|153.92|146.72|-868.5', instrument: 'MSTR/USDT', entryPrice: 153.92, exitPrice: 146.72, netPnl: -868.5, tradeIds: ['PT-20260919-6000', 'PT-20260919-6027'] },
  { signature: 'MSFT/USDT|493.78|468.72|-954.43', instrument: 'MSFT/USDT', entryPrice: 493.78, exitPrice: 468.72, netPnl: -954.43, tradeIds: ['PT-20260919-6034', 'PT-20260919-6057'] },
  { signature: 'MARA/USDT|13.24|17.42|5641.88', instrument: 'MARA/USDT', entryPrice: 13.24, exitPrice: 17.42, netPnl: 5641.88, tradeIds: ['PT-20260919-6050', 'PT-20260919-6058'] },
];

export const HISTORICAL_DUPLICATE_ROW_IDS = HISTORICAL_DUPLICATE_GROUPS.flatMap(g => g.tradeIds);
export const HISTORICAL_DUPLICATE_ROW_SET = new Set<string>(HISTORICAL_DUPLICATE_ROW_IDS);
