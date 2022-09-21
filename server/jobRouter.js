import { Router, json } from 'express';
import Engine from '../src/classes/model/critical/engine';

export default class JobRouter extends Router {
    constructor(props) {
        super(props);
        
        this.use('/critical-path', json())
            .post('/critical-path', (req, res) => {
                const goal = req.body;
                const engine = new Engine(goal.days);
                engine.execute(goal.infra);
                
                res.json(engine.result);
            })
    }
}
