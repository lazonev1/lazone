const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# withFirebaseNonModularFix';
const SPM_MARKER = '# withFirebaseDisableSPM';

// React Native Firebase 26 resolves Firebase through Swift Package Manager by
// default. Firebase's SPM products cannot be combined with the static framework
// linkage required by this Expo project, so use CocoaPods for Firebase instead.
// RNFirebase requires this global to appear before every target block.
const SPM_INJECTION = `${SPM_MARKER}
$RNFirebaseDisableSPM = true

`;

// RNFB pods must not be Clang modules: their headers do #include into React-Core
// headers that Expo has already made modular, causing "must be imported from module"
// hard errors. DEFINES_MODULE = NO keeps them as linkable static frameworks without
// registering them in the Clang module system.
const INJECTION = `  ${MARKER}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      if target.name.start_with?('RNFB')
        config.build_settings['DEFINES_MODULE'] = 'NO'
      end
    end
  end
`;

function withFirebaseNonModularFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes(SPM_MARKER)) {
        const firstTarget = contents.search(/^target\s/m);
        if (firstTarget === -1) {
          throw new Error('[withFirebaseNonModularFix] No iOS target block found');
        }
        contents = `${contents.slice(0, firstTarget)}${SPM_INJECTION}${contents.slice(firstTarget)}`;
      }

      if (!contents.includes(MARKER) && contents.includes('post_install do |installer|')) {
        contents = contents.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${INJECTION}`
        );
      } else if (!contents.includes(MARKER)) {
        throw new Error('[withFirebaseNonModularFix] No post_install block found');
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
}

module.exports = withFirebaseNonModularFix;
