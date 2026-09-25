import { listen, notify } from './events';

const EVENT_KEY = 'search-requested';

const requestSearch = () => notify(EVENT_KEY);

const listenSearchRequests = (listener: () => void) =>
  listen(EVENT_KEY, listener);

export {
  listenSearchRequests,
  requestSearch,
};
