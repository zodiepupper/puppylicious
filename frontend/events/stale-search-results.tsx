// Changing a search filter or answering a Q&A question changes which profiles
// a user's search results contain or how they're ranked. The search tab caches
// its results, so without a nudge it keeps showing the old results until
// refreshed. We flag the results as stale whenever they change and let the
// search tab refetch straight away if it's focused, or the next time it is.

import { listen, notify } from './events';

const EVENT_KEY = 'stale-search-results';

let isStale = false;

const markSearchResultsStale = (): void => {
  isStale = true;
  notify(EVENT_KEY);
};

const listenStaleSearchResults = (listener: () => void) =>
  listen(EVENT_KEY, listener);

// Whether the results have gone stale since this was last called. Reading it
// clears the flag, so the search tab refreshes exactly once per change.
const consumeStaleSearchResults = (): boolean => {
  const wasStale = isStale;
  isStale = false;
  return wasStale;
};

export {
  markSearchResultsStale,
  consumeStaleSearchResults,
  listenStaleSearchResults,
};
