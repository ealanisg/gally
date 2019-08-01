const fs = require('fs');
const path = require('path');
const get = require('lodash.get');
const set = require('lodash.set');
const mergeWith = require('lodash.mergewith');
const inquirer = require('inquirer');
const json = require('./util/json');
const ci = require('./util/ci');

module.exports.load = async (configDir, cwd) => {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
  }

  const globalConfigFile = path.join(configDir, 'config');
  const credentialsFile = path.join(configDir, 'credentials');

  const globalConfig = json.loadOrDefault(globalConfigFile);
  const credentials = json.loadOrDefault(credentialsFile);

  if (get(credentials, 'github.token', process.env.GH_TOKEN) === undefined && !ci.isCI()) {
    const token = (await inquirer.prompt([{
      type: 'password',
      message: 'Enter github personal access token',
      name: 'token',
      mask: '*'
    }])).token;
    set(credentials, 'github.token', token);
  }

  json.write(globalConfigFile, globalConfig);
  json.write(credentialsFile, credentials);

  const localConfig = json.loadOrDefault(path.join(cwd, '.gally.json'), null);
  if (localConfig !== null) {
    const expandProtections = (protections) => {
      const result = JSON.parse(JSON.stringify(protections));
      Object.keys(protections).forEach((protectionRef) => {
        let parent = protections[protectionRef]['@'];
        while (parent !== undefined) {
          result[protectionRef] = mergeWith({}, protections[parent], result[protectionRef], (original, add) => {
            if (!(add instanceof Object) || add instanceof Array) {
              return add;
            }
            return undefined;
          });
          parent = protections[parent]['@'];
        }
        delete result[protectionRef]['@'];
      });
      return result;
    };
    localConfig.protection = expandProtections(localConfig.protection);
  }

  return {
    config: {
      local: localConfig,
      global: globalConfig
    },
    credentials
  };
};
