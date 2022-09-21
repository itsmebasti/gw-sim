import Queue from 'bull';
import Engine from '../src/classes/model/critical/engine';
import cluster from 'cluster';

let started;
let result;
let resolve;
let threshold;

cluster.setupPrimary({ exec: 'server/clusterWorker.js' });

cluster.on('message', (worker, {timePassed, path}) => {
    console.log({timePassed, path});
    if(timePassed < threshold) {
        result = path;
        Object.values(cluster.workers).forEach((worker) => worker.send({threshold: timePassed}))
    }
});

cluster.on('disconnect', () => {
    if(Object.values(cluster.workers).length === 0) {
        console.log("resolved");
        resolve({
            path: result,
            millis: Date.now() - started
        });
    }
});

let REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const jobs = new Queue('jobs', REDIS_URL, {
    settings: {
        lockDuration: 60 * 60 * 1000,
        maxStalledCount: 0
    }
});

jobs.process((job) => {
    // console.log(job);
    const { data: { days, infra }, timestamp } = job;
    threshold = days * 24 * 3600;
    const engine = new Engine(threshold);
    engine.onSuccess((path, timePassed) => {
        threshold = timePassed;
        result = path;
    });
    engine.execute(infra);
    
    return new Promise((res) => {
        started = timestamp;
        resolve = res;
    });
});
