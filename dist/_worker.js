const API_ORIGIN = new URL('https://dawa-smart-api.rashidjumachepkwony.workers.dev');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      url.protocol = API_ORIGIN.protocol;
      url.hostname = API_ORIGIN.hostname;
      url.port = API_ORIGIN.port;
      return fetch(new Request(url, request));
    }

    return env.ASSETS.fetch(request);
  }
};
