const middy = require('middy');
const { errors } = require('./statusCodes');
const { OK } = require('http-status-codes');
const {
  httpEventNormalizer,
  jsonBodyParser,
  doNotWaitForEmptyEventLoop,
} = require('middy/middlewares');

const promise = Promise.resolve();

const stringify = (r) => ({ ...r, body: JSON.stringify(r.body) });

const maybeStringify = (d) => (typeof d === 'string' ? d : JSON.stringify(d));

const onResponse = () => ({
  after: (handler, next) => {
    const { response } = handler;
    handler.response = {
      statusCode: response.statusCode || OK,
      headers: response.headers,
      body: maybeStringify(response.body || response),
    };
    next();
  },
});

const onError = () => ({
  onError: (handler, next) => {
    console.log(handler.error);
    handler.response = stringify(errors.server);
    next();
  },
});

const saveRawRequest = () => ({
  before: (handler, next) => {
    const { body } = handler.event;
    handler.event.rawBody = body;
    next();
  },
});

// -- cors
// https://raw.githubusercontent.com/middyjs/middy/master/src/middlewares/cors.js
// Adds Access-Control-Allow-Methods
const defaults = {
  origin: '*',
  origins: [],
  headers: null,
  credentials: false,
};

const getOrigin = (options, handler) => {
  handler.event.headers = handler.event.headers || {};
  if (options.origins && options.origins.length > 0) {
    if (
      handler.event.headers.hasOwnProperty('Origin') &&
      options.origins.includes(handler.event.headers.Origin)
    ) {
      return handler.event.headers.Origin;
    } else {
      return options.origins[0];
    }
  } else {
    if (
      handler.event.headers.hasOwnProperty('Origin') &&
      options.credentials &&
      options.origin === '*'
    ) {
      return handler.event.headers.Origin;
    }
    return options.origin;
  }
};

const addCorsHeaders = (opts, handler, next) => {
  const options = Object.assign({}, defaults, opts);

  if (handler.event.hasOwnProperty('httpMethod')) {
    handler.response = handler.response || {};
    handler.response.headers = handler.response.headers || {};

    // ADDED: always allow all methods
    handler.response.headers['Access-Control-Allow-Methods'] = '*';

    // Check if already setup Access-Control-Allow-Headers
    if (
      options.headers !== null &&
      !handler.response.headers.hasOwnProperty('Access-Control-Allow-Headers')
    ) {
      handler.response.headers['Access-Control-Allow-Headers'] = options.headers;
    }

    // Check if already setup the header Access-Control-Allow-Credentials
    if (handler.response.headers.hasOwnProperty('Access-Control-Allow-Credentials')) {
      options.credentials = JSON.parse(
        handler.response.headers['Access-Control-Allow-Credentials']
      );
    }

    if (options.credentials) {
      handler.response.headers['Access-Control-Allow-Credentials'] = String(options.credentials);
    }
    // Check if already setup the header Access-Control-Allow-Origin
    if (!handler.response.headers.hasOwnProperty('Access-Control-Allow-Origin')) {
      handler.response.headers['Access-Control-Allow-Origin'] = getOrigin(options, handler);
    }
  }

  next(handler.error);
};

const cors = (opts) => ({
  after: addCorsHeaders.bind(null, opts),
  onError: addCorsHeaders.bind(null, opts),
});

// -- end cors

// NOTE: the last middleware is the handler
module.exports = (...middlewares) => {
  const index = middlewares.length - 1;
  const handler = middlewares.slice(index)[0];
  const middyfied = middy((event) => promise.then(() => handler(event)))
    .use(doNotWaitForEmptyEventLoop())
    .use(onError())
    .use(httpEventNormalizer())
    .use(saveRawRequest())
    .use(jsonBodyParser())
    .use(cors({ headers: 'Authorization,content-type' }))
    .use(onResponse());
  middlewares.slice(0, index).forEach((before) => middyfied.use({ before }));
  return middyfied;
};
