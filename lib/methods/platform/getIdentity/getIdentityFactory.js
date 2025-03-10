const {
  v0: {
    PlatformPromiseClient,
    GetIdentityRequest,
  },
} = require('strophy-dapi-grpc');

const grpcErrorCodes = require('strophy-grpc-common/lib/server/error/GrpcErrorCodes');

const bs58 = require('bs58');

const GetIdentityResponse = require('./GetIdentityResponse');
const NotFoundError = require('../../errors/NotFoundError');
const InvalidResponseError = require('../response/errors/InvalidResponseError');

/**
 * @param {GrpcTransport} grpcTransport
 * @returns {getIdentity}
 */
function getIdentityFactory(grpcTransport) {
  /**
   * Fetch the identity by id
   *
   * @typedef {getIdentity}
   * @param {Buffer} id
   * @param {DAPIClientOptions & {prove: boolean}} [options]
   * @returns {Promise<GetIdentityResponse>}
   */
  async function getIdentity(id, options = {}) {
    const getIdentityRequest = new GetIdentityRequest();
    // need to convert objects inherited from Buffer to pure buffer as google protobuf
    // doesn't support extended buffers
    // https://github.com/protocolbuffers/protobuf/blob/master/js/binary/utils.js#L1049
    if (Buffer.isBuffer(id)) {
      // eslint-disable-next-line no-param-reassign
      id = Buffer.from(id);
    }

    getIdentityRequest.setId(id);
    getIdentityRequest.setProve(!!options.prove);

    let lastError;

    // TODO: simple retry before the dapi versioning is properly implemented
    for (let i = 0; i < 3; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const getIdentityResponse = await grpcTransport.request(
          PlatformPromiseClient,
          'getIdentity',
          getIdentityRequest,
          options,
        );

        return GetIdentityResponse.createFromProto(getIdentityResponse);
      } catch (e) {
        if (e.code === grpcErrorCodes.NOT_FOUND) {
          throw new NotFoundError(`Identity ${bs58.encode(id)} is not found`);
        }
        if (e instanceof InvalidResponseError) {
          lastError = e;
        } else {
          throw e;
        }
      }
    }

    // If we made it past the cycle it means that the retry didn't work,
    // and we're throwing the last error encountered
    throw lastError;
  }

  return getIdentity;
}

module.exports = getIdentityFactory;
