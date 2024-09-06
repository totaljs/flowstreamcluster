const DB_FILE = 'database.json';
const DIRECTORY = CONF.directory || PATH.root('flowstream');

PATH.mkdir(DIRECTORY);
PATH.mkdir(PATH.private());

function skip(key, value) {
	return key === 'unixsocket' || key === 'env' ? undefined : value;
}

Flow.on('save', function() {

	for (var key in Flow.db) {
		if (key !== 'variables') {
			var flow = Flow.db[key];
			flow.size = Buffer.byteLength(JSON.stringify(flow));
		}
	}

	if (CONF.backup) {
		PATH.fs.rename(PATH.join(DIRECTORY, DB_FILE), PATH.join(DIRECTORY, DB_FILE.replace(/\.json/, '') + '_' + (new Date()).format('yyyyMMddHHmm') + '.bk'), function() {
			PATH.fs.writeFile(PATH.join(DIRECTORY, DB_FILE), JSON.stringify(Flow.db, skip, '\t'), ERROR('FlowStream.save'));
		});
	} else
		PATH.fs.writeFile(PATH.join(DIRECTORY, DB_FILE), JSON.stringify(Flow.db, skip, '\t'), ERROR('FlowStream.save'));
});

function init(id, next) {

	var flow = Flow.db[id];

	flow.variables2 = Flow.db.variables || {};
	flow.directory = CONF.directory || PATH.root('/flowstream/');
	flow.sandbox = CONF.flowstream_sandbox == true;

	if (!flow.memory)
		flow.memory = CONF.flowstream_memory || 0;

	flow.asfiles = CONF.flowstream_asfiles === true;
	flow.worker = CONF.flowstream_worker;

	Flow.load(flow, function(err, instance) {
		if (err)
			Total.error(err, id + ': ' + flow.name);
		next();
	});
}

ON('ready', function() {

	PATH.fs.readFile(PATH.join(DIRECTORY, DB_FILE), function(err, data) {

		Flow.db = data ? data.toString('utf8').parseJSON(true) : {};

		if (!Flow.db.variables)
			Flow.db.variables = {};

		Object.keys(Flow.db).wait(function(key, next) {
			if (key === 'variables')
				next();
			else
				init(key, next);
		});

	});

});