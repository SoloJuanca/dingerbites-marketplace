/**
 * tcgcsv.com requires a custom User-Agent; Node/Next fetch without it often gets 401.
 * @see https://tcgcsv.com/docs
 */
export const TCG_CSV_BASE = 'https://tcgcsv.com/tcgplayer';

const DEFAULT_UA = 'Dingerbites/1.0 (https://dingerbites.com)';

export function tcgcsvHeaders(overrides = {}) {
  return {
    Accept: 'application/json',
    'User-Agent': process.env.TCGCSV_USER_AGENT || DEFAULT_UA,
    ...overrides
  };
}
