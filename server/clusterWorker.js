import Engine from '../src/classes/model/critical/engine';

const {path, state, target, threshold} = JSON.parse(process.env['START_SETUP']);

const engine = new Engine(threshold);
process.on('message', ({threshold}) => engine.threshold = threshold);
engine.onSuccess((path, timePassed) => process.send({timePassed, path}));
engine.execute(target, path, state);
