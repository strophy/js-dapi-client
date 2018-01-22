const axios = require('axios');

const defaultHost = '127.0.0.1';

/**
 * @param {string|object} url - rpc endpoint config
 * @param {string} [url.host]
 * @param {string|number} [url.port]
 * @param method
 * @param params
 * @returns {Promise<void>}
 */
async function request(url, method, params) {
  let destination = url;
  if (typeof url !== 'string') {
    destination = `http://${url.host ? url.host : defaultHost}:${url.port ? url.port : ''}`;
  }
  const res = await axios.post(destination, {
    jsonrpc: '2.0',
    method,
    params,
    id: 1,
  });
  if (res.status !== 200) {
    throw new Error(res.statusMessage);
  }
  return res.data;
}

module.exports = {
  request,
};
