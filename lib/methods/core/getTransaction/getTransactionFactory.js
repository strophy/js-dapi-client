const {
  v0: {
    GetTransactionRequest,
    CorePromiseClient,
  },
} = require('strophy-dapi-grpc');

const grpcErrorCodes = require('strophy-grpc-common/lib/server/error/GrpcErrorCodes');
const GetTransactionResponse = require('./GetTransactionResponse');
const NotFoundError = require('../../errors/NotFoundError');
const InvalidResponseError = require('../../platform/response/errors/InvalidResponseError');

/**
 * @param {GrpcTransport} grpcTransport
 * @returns {getTransaction}
 */
function getTransactionFactory(grpcTransport) {
  /**
   * Get Transaction by ID
   *
   * @typedef {getTransaction}
   * @param {string} id
   * @param {DAPIClientOptions} [options]
   * @returns {Promise<null|Buffer>}
   */
  async function getTransaction(id, options = {}) {
    const getTransactionRequest = new GetTransactionRequest();
    getTransactionRequest.setId(id);

    let lastError;

    // TODO: simple retry before the dapi versioning is properly implemented
    for (let i = 0; i < 3; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const response = await grpcTransport.request(
          CorePromiseClient,
          'getTransaction',
          getTransactionRequest,
          options,
        );

        return GetTransactionResponse.createFromProto(response);
      } catch (e) {
        if (e.code === grpcErrorCodes.NOT_FOUND) {
          throw new NotFoundError(`Transaction ${id} is not found`);
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

  return getTransaction;
}

module.exports = getTransactionFactory;
