const middify = require('./middify');
const { errors } = require('./statusCodes');
const { pathToRegexp } = require('path-to-regexp');

module.exports = (configureRoutes) => {
  const methods = ['put', 'post', 'get', 'patch', 'delete', 'options'];
  const routes = {};
  const route = {};
  const cors = { keys: [], middlewares: [() => ({})] };

  methods.forEach((method) => {
    const createRoute = (path, ...middlewares) => {
      const keys = [];
      const regexp = pathToRegexp(path, keys);
      routes[method].push({ regexp, middlewares, keys });
    };
    routes[method] = [];
    route[method] = createRoute;
  });

  const handleRouteNotFound = (method, path, callback) =>
    callback(null, errors.notFoundMsg(`"${method} ${path}" not found`));

  const handleRouteFound = (found, event, context, callback) => {
    const { keys, match, middlewares } = found;
    const param = {};
    const req = { ...event, param };
    if (keys.length > 0) {
      keys.forEach((k, i) => (param[k.name] = match[i + 1]));
    }
    return middify(...middlewares)(req, context, callback);
  };

  configureRoutes(route);
  return (event, context, callback) => {
    const { httpMethod, path } = event;
    const method = httpMethod.toLowerCase();
    if (method === 'options') {
      return handleRouteFound(cors, event, context, callback);
    }
    const found = routes[method].reduce((a, c) => {
      const match = c.regexp.exec(path);
      return match ? { ...c, match } : a;
    }, false);

    return !found
      ? handleRouteNotFound(httpMethod, path, callback)
      : handleRouteFound(found, event, context, callback);
  };
};
