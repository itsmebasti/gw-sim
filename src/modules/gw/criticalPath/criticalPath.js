import SldsWebComponent from '../../../classes/framwork/misc/sldsWebComponent';
import technologies from '../../../classes/model/static/technologies';
import Account from '../../../classes/model/infra/account'
import toHHMMSS from '../../../classes/framwork/misc/toHHMMSS';
import Engine from '../../../classes/model/critical/engine';

export default class CriticalPath extends SldsWebComponent {
    account = new Account();
    
    steps = [];
    hideDetails = false;
    calculateLocal = true;
    level = 8;
    days = 6;
    
    build(evt) {
        this.print(['Eisenmine']);
        const type = evt.target.innerText;
        const goal = {days: this.days, infra: {[type] : Number(this.level)}};
        let result;
        
        if(this.calculateLocal) {
            const start = Date.now();
            const engine = new Engine(goal.days);
            engine.execute(goal.infra);
            result = { path: engine.result, millis: Date.now() - start };
            console.log(result.millis);
            this.print(result.path);
        }
        else {
            const start = Date.now();
            fetch('/job/critical-path', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(goal)
            })
            .then((response) => response.json())
            .then((result) => {
                console.log(Date.now() - start);
                this.print(result);
            })
            .catch(console.error);
        }
    }
    
    fetchJobResult(jobId) {
        return fetch('/job/' + jobId)
            .then((response) => {
                const { status, statusText } = response;
                return status === STATUS.TIMEOUT ? this.fetchJobResult(jobId) :
                        status === STATUS.SUCCESS ? response.json() :
                        (console.error(statusText), this.fetchJobResult(jobId));
            })
    }
    
    get constructions() {
        return [
            {label: 'Gebäude', options: technologies.buildings, open : 1},
            {label: 'Forschung', options: technologies.research, open : 1},
            {label: 'Schiffe', options: technologies.ships, open : 1},
            {label: 'Türme', options: technologies.towers, open : 1},
        ]
    }
    
    print = (path) => {
        this.account = new Account();
        this.logger.reset(0, this.account);
    
        path.forEach((building) => {
            this.logger.command("Starte " + building);
            this.account.completeAndEnqueue(building);
        });
    
        this.logger.command("Fertig Bauen");
        this.account.completeAll();
    
        this.template.querySelector('.path').value = JSON.stringify(this.steps);
    }
    
    toggleDetails() {
        this.hideDetails = !this.hideDetails;
    }
    
    copy(evt) {
        navigator.clipboard.writeText(this.template.querySelector('.path').value);
    }
    
    updateLevel(evt) {
        this.level = evt.target.value;
    }
    
    updateDays(evt) {
        this.days = evt.target.value;
    }
    
    toggleAllocation(evt) {
        this.calculateLocal = !this.calculateLocal;
    }
    
    // Getters
    
    get pathString() {
        let result = [];
        if(this.account) {
            result = this.steps;
        }
        
        return JSON.stringify(result);
    }
    
    get resources() {
        return this.account?.planet.resources.printable ?? [];
    }
    
    get logger() {
        return this.template.querySelector("gw-path-logger");
    }
    
    get showDetails() {
        return !this.hideDetails;
    }
    
    get threshold() {
        return toHHMMSS(this.days * 24 * 3600);
    }
    
    get serverTime() {
        return toHHMMSS(this.account?.passed ?? 0);
    }
}
