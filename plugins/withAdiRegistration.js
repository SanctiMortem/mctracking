const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, 'assets', 'adi-registration.properties');
      const destDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets');
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, 'adi-registration.properties'));
      return cfg;
    },
  ]);
};
