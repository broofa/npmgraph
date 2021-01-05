import { fetchJSON, report } from './util.js';
import Module, { moduleKey } from './Module.js';
import * as semver from '/vendor/semver.js';

const _requestCache = {};
const stats = { active: 0, complete: 0 };

export function init() {
  // Reconstitute [uploaded] modules from sessionStorage
  const { sessionStorage } = window;
  for (let i = 0; i < sessionStorage.length; i++) {
    try {
      const module = JSON.parse(sessionStorage.getItem(sessionStorage.key(i)));
      if (!module?.name) continue;

      console.log('Restoring', module.name, module.version);
      cacheModule(module);
    } catch (err) {
      console.error(err);
    }
  }
}

function moduleEntryFromKey(key) {
  const MODULE_RE = /^(@?[^@]+)(?:@(.*))?$/;

  if (!MODULE_RE.test(key)) console.log('Invalid key', key);

  return RegExp.$2 ? [RegExp.$1, RegExp.$2] : [RegExp.$1];
}

// Inject a module directly into the request cache (used for module file uploads)
export function cacheModule(module) {
  let { name, version } = module;
  name = name.replace(/\//g, '%2F');
  const path = version ? `${name}/${version}` : name;
  _requestCache[path] = Promise.resolve(module);

  return path;
}

// fetch module url, caching results (in memory for the time being)
async function fetchModule(name, version) {
  const isScoped = name.startsWith('@');
  const versionIsValid = semver.valid(version);

  // url-escape "/"'s in the name
  const path = `${name.replace(/\//g, '%2F')}`;
  const pathAndVersion = `${path}/${version}`;

  // Use cached request if available.  (We can get module info from versioned or unversioned API requests)
  let req = _requestCache[pathAndVersion] || _requestCache[path];

  if (!req) {
    // If semver isn't valid (i.e. not a simple, canonical version - e.g.
    // "1.2.3") fetch all versions (we'll figure out the specific version below)
    //
    // Also, we can't fetch scoped modules at specific versions.  See https://goo.gl/dSMitm
    const reqPath = !isScoped && versionIsValid ? pathAndVersion : path;

    req = _requestCache[reqPath] = fetchJSON(`https://registry.npmjs.cf/${reqPath}`)
      // Errors get turned into stub modules, below
      .catch(err => err);

    req.finally(() => {
      stats.active--;
      stats.complete++;
      Store.onRequest?.(stats);
    });

    stats.active++;
    Store.onRequest?.(stats);
  }

  let body;
  try {
    body = await req;
  } catch (err) {
    body = err;
  }

  if (!body) {
    body = Error('No info provided by NPM repo');
  } else if (typeof (body) != 'object') {
    body = Error('Data provided by NPM repo is not in the expected format');
  } else if (body.unpublished) {
    body = Error('Module is unpublished');
  } else if (body.versions) {
    // Available versions (most recent first)
    const versions = Object.values(body.versions).reverse();

    // Version we're looking for
    version = version || body['dist-tags']?.latest || '*';

    // Resolve to specific version (use version specifier if provided, otherwise latest dist version, otherwise latest)
    const resolvedVersion = versions.find(v => semver.satisfies(v.version, version));

    body = resolvedVersion || Error(`No version matching "${version}" found`);
  }

  // Error = stub module containing the error
  if (body instanceof Error) {
    return Module.stub({ name, version, error: body });
  }

  return body;
}

const _moduleCache = {};
const Store = {
  cachedEntry(key) {
    if (!_moduleCache[key]) throw Error(`${key} is not cached`);
    return _moduleCache[key];
  },

  getModule(name, version) {
    // Parse versioned-names (e.g. "less@1.2.3")
    if (!version && /(.+)@(.*)/.test(name)) {
      name = RegExp.$1;
      version = RegExp.$2;
    }

    // Remove "git...#" repo URIs from version strings
    if (version) version = version.replace(/git.*#/, '');

    const cacheKey = moduleKey(name, version);

    if (!_moduleCache[cacheKey]) {
      _moduleCache[cacheKey] = fetchModule(name, version)
        .then(moduleInfo => {
          const module = new Module(moduleInfo);

          // Cache based on arguments (memoize), but also cache based on name
          // and version as declared in module info
          _moduleCache[cacheKey] = module;
          _moduleCache[`${module.name}@${module.version}`] = module;

          return _moduleCache[cacheKey] = module;
        })
        .catch(err => report.error(err));
    }

    return _moduleCache[cacheKey];
  }
};

export default Store;