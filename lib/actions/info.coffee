packageJSON = require('../../package.json')

exports.version =
	signature: 'version'
	description: 'output the version number'
	help: '''
		Display the Resin CLI, as well as the bundled NodeJS version.
	'''
	action: ->
		console.log("#{packageJSON.name}: #{packageJSON.version}")
		console.log("node: #{process.version}")
