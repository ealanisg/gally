const request = require('request-promise-native');
const crypto = require('crypto');

const cache = {};

const flushCache = () => {
  Object.keys(cache).forEach((e) => delete cache[e]);
};

const ghRequest = async (method, uri, token, body, cached) => {
  const md5 = [method, uri, token, body]
    .reduce((prev, cur) => prev.update(String(cur)), crypto.createHash('md5')).digest('hex');
  if (cached === false || method !== 'get' || cache[md5] === undefined) {
    cache[md5] = await request({
      method: method.toUpperCase(),
      uri,
      headers: {
        Authorization: `bearer ${token}`,
        'User-Agent': 'Gally: https://github.com/loopmediagroup/gally',
        Accept: 'application/vnd.github.luke-cage-preview+json'
      },
      resolveWithFullResponse: true,
      simple: false,
      json: true,
      body
    });
  }
  return cache[md5];
};

module.exports = Object.assign(['get', 'post', 'delete', 'put', 'patch'].reduce((prev, cur) => Object.assign(prev, {
  [cur]: (uri, token, { body = undefined, cached = false } = {}) => ghRequest(cur, uri, token, body, cached)
}), {}), { flushCache });
