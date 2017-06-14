// Generated by CoffeeScript 1.12.6

/*
Copyright 2016-2017 Resin.io

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */
var INIT_WARNING_MESSAGE, _, buildConfig, commandOptions, formatVersion, resolveVersion;

commandOptions = require('./command-options');

_ = require('lodash');

formatVersion = function(v, isRecommended) {
  var result;
  result = "v" + v;
  if (isRecommended) {
    result += ' (recommended)';
  }
  return result;
};

resolveVersion = function(deviceType, version) {
  var form, resin;
  if (version !== 'menu') {
    return Promise.resolve(version);
  }
  form = require('resin-cli-form');
  resin = require('resin-sdk-preconfigured');
  return resin.models.os.getSupportedVersions(deviceType).then(function(arg) {
    var choices, recommended, versions;
    versions = arg.versions, recommended = arg.recommended;
    choices = versions.map(function(v) {
      return {
        value: v,
        name: formatVersion(v, v === recommended)
      };
    });
    return form.ask({
      message: 'Select the OS version:',
      type: 'list',
      choices: choices,
      "default": recommended
    });
  });
};

exports.versions = {
  signature: 'os versions <type>',
  description: 'show the available resinOS versions for the given device type',
  help: 'Use this command to show the available resinOS versions for a certain device type.\nCheck available types with `resin devices supported`\n\nExample:\n\n	$ resin os versions raspberrypi3',
  action: function(params, options, done) {
    var resin;
    resin = require('resin-sdk-preconfigured');
    return resin.models.os.getSupportedVersions(params.type).then(function(arg) {
      var recommended, versions;
      versions = arg.versions, recommended = arg.recommended;
      return versions.forEach(function(v) {
        return console.log(formatVersion(v, v === recommended));
      });
    });
  }
};

exports.download = {
  signature: 'os download <type>',
  description: 'download an unconfigured os image',
  help: 'Use this command to download an unconfigured os image for a certain device type.\nCheck available types with `resin devices supported`\n\nIf version is not specified the newest stable (non-pre-release) version of OS\nis downloaded if available, or the newest version otherwise (if all existing\nversions for the given device type are pre-release).\n\nYou can pass `--version menu` to pick the OS version from the interactive menu\nof all available versions.\n\nExamples:\n\n	$ resin os download raspberrypi3 -o ../foo/bar/raspberry-pi.img\n	$ resin os download raspberrypi3 -o ../foo/bar/raspberry-pi.img --version 1.24.1\n	$ resin os download raspberrypi3 -o ../foo/bar/raspberry-pi.img --version ^1.20.0\n	$ resin os download raspberrypi3 -o ../foo/bar/raspberry-pi.img --version latest\n	$ resin os download raspberrypi3 -o ../foo/bar/raspberry-pi.img --version default\n	$ resin os download raspberrypi3 -o ../foo/bar/raspberry-pi.img --version menu',
  permission: 'user',
  options: [
    {
      signature: 'output',
      description: 'output path',
      parameter: 'output',
      alias: 'o',
      required: 'You have to specify the output location'
    }, commandOptions.osVersion
  ],
  action: function(params, options, done) {
    var Promise, displayVersion, fs, manager, rindle, unzip, visuals;
    Promise = require('bluebird');
    unzip = require('unzip2');
    fs = require('fs');
    rindle = require('rindle');
    manager = require('resin-image-manager');
    visuals = require('resin-cli-visuals');
    console.info("Getting device operating system for " + params.type);
    displayVersion = '';
    return Promise["try"](function() {
      if (!options.version) {
        console.warn('OS version is not specified, using the default version: the newest stable (non-pre-release) version if available, or the newest version otherwise (if all existing versions for the given device type are pre-release).');
        return 'default';
      }
      return resolveVersion(params.type, options.version);
    }).then(function(version) {
      if (version !== 'default') {
        displayVersion = " " + version;
      }
      return manager.get(params.type, version);
    }).then(function(stream) {
      var bar, output, spinner;
      bar = new visuals.Progress("Downloading Device OS" + displayVersion);
      spinner = new visuals.Spinner("Downloading Device OS" + displayVersion + " (size unknown)");
      stream.on('progress', function(state) {
        if (state != null) {
          return bar.update(state);
        } else {
          return spinner.start();
        }
      });
      stream.on('end', function() {
        return spinner.stop();
      });
      if (stream.mime === 'application/zip') {
        output = unzip.Extract({
          path: options.output
        });
      } else {
        output = fs.createWriteStream(options.output);
      }
      return rindle.wait(stream.pipe(output))["return"](options.output);
    }).tap(function(output) {
      return console.info('The image was downloaded successfully');
    }).nodeify(done);
  }
};

buildConfig = function(image, deviceType, advanced) {
  var form, helpers;
  if (advanced == null) {
    advanced = false;
  }
  form = require('resin-cli-form');
  helpers = require('../utils/helpers');
  return helpers.getManifest(image, deviceType).get('options').then(function(questions) {
    var advancedGroup, override;
    if (!advanced) {
      advancedGroup = _.findWhere(questions, {
        name: 'advanced',
        isGroup: true
      });
      if (advancedGroup != null) {
        override = helpers.getGroupDefaults(advancedGroup);
      }
    }
    return form.run(questions, {
      override: override
    });
  });
};

exports.buildConfig = {
  signature: 'os build-config <image> <device-type>',
  description: 'build the OS config and save it to the JSON file',
  help: 'Use this command to prebuild the OS config once and skip the interactive part of `resin os configure`.\n\nExamples:\n\n	$ resin os build-config ../path/rpi3.img raspberrypi3 --output rpi3-config.json\n	$ resin os configure ../path/rpi3.img 7cf02a6 --config "$(cat rpi3-config.json)"',
  permission: 'user',
  options: [
    commandOptions.advancedConfig, {
      signature: 'output',
      description: 'the path to the output JSON file',
      alias: 'o',
      required: 'the output path is required',
      parameter: 'output'
    }
  ],
  action: function(params, options, done) {
    var Promise, fs, writeFileAsync;
    fs = require('fs');
    Promise = require('bluebird');
    writeFileAsync = Promise.promisify(fs.writeFile);
    return buildConfig(params.image, params['device-type'], options.advanced).then(function(answers) {
      return writeFileAsync(options.output, JSON.stringify(answers, null, 4));
    }).nodeify(done);
  }
};

exports.configure = {
  signature: 'os configure <image> <uuid>',
  description: 'configure an os image',
  help: 'Use this command to configure a previously downloaded operating system image for the specific device.\n\nExamples:\n\n	$ resin os configure ../path/rpi.img 7cf02a6',
  permission: 'user',
  options: [
    commandOptions.advancedConfig, {
      signature: 'config',
      description: 'path to the config JSON file, see `resin os build-config`',
      parameter: 'config'
    }
  ],
  action: function(params, options, done) {
    var Promise, fs, helpers, init, readFileAsync, resin;
    fs = require('fs');
    Promise = require('bluebird');
    readFileAsync = Promise.promisify(fs.readFile);
    resin = require('resin-sdk-preconfigured');
    init = require('resin-device-init');
    helpers = require('../utils/helpers');
    console.info('Configuring operating system image');
    return resin.models.device.get(params.uuid).then(function(device) {
      if (options.config) {
        return readFileAsync(options.config, 'utf8').then(JSON.parse);
      }
      return buildConfig(params.image, device.device_type, options.advanced);
    }).then(function(answers) {
      return init.configure(params.image, params.uuid, answers).then(helpers.osProgressHandler);
    }).nodeify(done);
  }
};

INIT_WARNING_MESSAGE = 'Note: Initializing the device may ask for administrative permissions\nbecause we need to access the raw devices directly.';

exports.initialize = {
  signature: 'os initialize <image>',
  description: 'initialize an os image',
  help: "Use this command to initialize a device with previously configured operating system image.\n\n" + INIT_WARNING_MESSAGE + "\n\nExamples:\n\n	$ resin os initialize ../path/rpi.img --type 'raspberry-pi'",
  permission: 'user',
  options: [
    commandOptions.yes, {
      signature: 'type',
      description: 'device type (Check available types with `resin devices supported`)',
      parameter: 'type',
      alias: 't',
      required: 'You have to specify a device type'
    }, commandOptions.drive
  ],
  action: function(params, options, done) {
    var Promise, form, helpers, patterns, umountAsync;
    Promise = require('bluebird');
    umountAsync = Promise.promisify(require('umount').umount);
    form = require('resin-cli-form');
    patterns = require('../utils/patterns');
    helpers = require('../utils/helpers');
    console.info("Initializing device\n\n" + INIT_WARNING_MESSAGE);
    return helpers.getManifest(params.image, options.type).then(function(manifest) {
      var ref;
      return (ref = manifest.initialization) != null ? ref.options : void 0;
    }).then(function(questions) {
      return form.run(questions, {
        override: {
          drive: options.drive
        }
      });
    }).tap(function(answers) {
      if (answers.drive == null) {
        return;
      }
      return patterns.confirm(options.yes, "This will erase " + answers.drive + ". Are you sure?", "Going to erase " + answers.drive + ".")["return"](answers.drive).then(umountAsync);
    }).tap(function(answers) {
      return helpers.sudo(['internal', 'osinit', params.image, options.type, JSON.stringify(answers)]);
    }).then(function(answers) {
      if (answers.drive == null) {
        return;
      }
      return umountAsync(answers.drive).tap(function() {
        return console.info("You can safely remove " + answers.drive + " now");
      });
    }).nodeify(done);
  }
};
