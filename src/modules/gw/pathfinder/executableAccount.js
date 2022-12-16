import InfraEvent from "../../../classes/framwork/events/infraEvent";
import Account from "../../../classes/model/infra/account";
import ResourceChanges from "../../../classes/model/resources/resourceChanges";

export default class ExecutableAccount extends Account {
    database = new Database();
    
    pathHasErrors = false;
    
    constructor(accountState) {
        super(accountState);
    }
    
    get serverSeconds() {
        return this.serverTime/1000;
    }
    
    addKoloEvents() {
        for(let kolo of this.kolos) {
            const koloStartSeconds = Math.max(kolo.startTime - this.serverSeconds, 0);
            
            this.register(new InfraEvent(E.NEW_PLANET, kolo, path.coords), {time: koloStartSeconds});
        }
    }
    
    addResourceEvents() {
        this.resFleets?.forEach((fleet) => {
            const time = fleet.delivery.time - this.serverSeconds;
            const resourceChanges = new ResourceChanges(...Object.values(fleet.res), this.resChangeType(fleet));

            this.register(new InfraEvent(E.RESOURCE_CHANGE, { resourceChanges }, fleet.delivery.planet.coords), {time});
        });
    }

    resChangeType({mission, source, target, friendly}) {
        return (mission === 'Transport' && source.isOwnPlanet) ? CHANGE.TRANSPORT :
                (mission === 'Stationierung') ? CHANGE.TRANSPORT :
                (friendly && !target.exists) ? CHANGE.TRANSPORT :
                (!friendly && source.isOwnPlanet) ? CHANGE.FARM :
                (mission === 'Transport' && !source.isOwnPlanet) ? CHANGE.TRADE :
                (mission === 'Transport' && !target.isOwnPlanet && target.exists) ? CHANGE.TRADE_OUT : '';
    }
    
    execute(coords, steps, logger) {
        this.pathHasErrors = false;
        this.requested = [0, 0, 0, 0];
        
        if(this.iskolo(coords)) {
            this.rebaseTo(this.kolos[coords].startTime);
        }
        
        for(step of steps) {
            try {
                switch (step.type) {
                    case 'res':
                        logger?.command('Res: ' + step.values);
                        this.addResources(step.values);
                        logger?.markAsSucceeded();
                        break;
                    case 'start':
                        this.produceResForNextBuild = step.produce ?? true;
                        logger?.command('Starte ' + step.tec + ' ' + (this.levelFor(step.tec) + 1), this.produceResForNextBuild);
                        this.completeAndEnqueue(step.tec);
                        this.produceResForNextBuild = true;
                        break;
                    case 'wait':
                        logger?.command('Warten ' + toHHMMSS(step.seconds));
                        this.continue(step.seconds);
                        break;
                    case 'complete':
                        if(step.factory) {
                            logger?.command(step.factory + ': Auftrag abschließen');
                            this.complete(step.factory);
                        }
                        else {
                            logger?.command('Alle Aufträge abschließen');
                            this.completeAllOn(this.cache.coords);
                        }
                        break;
                    case 'resetCount':
                        logger?.command('Bis hier werden (' + this.generated + ') benötigt');
                        this.requested = [0, 0, 0, 0];
                        break;
                }
            }
            catch(error) {
                if(error instanceof ResourceError) {
                    logger?.markAsRejected();
                }
                this.pathHasErrors = true;
                logger?.printError(error);
            }
        }
    }
}