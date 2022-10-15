import { LightningElement, api, track } from 'lwc';
import { toHHMMSS, dateTimeString, toSeconds, compactString } from '../../../classes/framwork/misc/timeConverters';
import { E } from '../../../classes/model/static/types';

export default class PathLogger extends LightningElement {
    @api hideDetails = false;
    @api inlineDetails = false;
    @track logs = [];
    @api reverse;
    account
    startTime;
    serverTime;

    idCounter;
    commandCounter;
    @api pointer;

    connectedCallback() {
        document.addEventListener('keydown', (evt) => {
            if (!evt.ctrlKey && this.template.activeElement) {
                switch(evt.key) {
                    case 'ArrowUp': case 'w': case 'W':
                        this.handleMoveKeyInput(evt, +1);
                        break;
                    case 'ArrowDown': case 's': case 'S':
                        this.handleMoveKeyInput(evt, -1);
                        break;
                }
            }
        });
    }

    renderedCallback() {
        this.template.querySelector(`li.command[data-command='${this.pointer}'] div[tabindex='-1']`)?.focus();
    }

    @api
    reset(account) {
        this.account = account;
        this.startTime = account.serverTime;
        this.serverTime = account.serverTime;
        this.logs = [];
        this.idCounter = 0;
        this.commandCounter = -1;
        this.startListening(account);
    }

    @api
    command(message, settings = []) {
        this.logs.push({
            id: this.idCounter++,
            command: ++this.commandCounter,
            severity: 'command',
            message,
            settings,
            isCommand: true,
            cssClass: 'command'});
    }

    @api
    printError({message, details = []}) {
        details.forEach((detail) => {
            this.logs.push({
                id: this.idCounter++,
                command: this.commandCounter,
                settings: [],
                message: detail,
                isDetail: true,
                cssClass: 'detail'});
        });
        this.log('ERROR', message, 'error');
    }

    @api
    addWarning() {
        if(!this.latestCommand) return;
        this.latestCommand.severity += ' warning';
    }

    @api
    markAsSucceeded(construction, duration) {
        if(!this.latestCommand) return;
        
        this.latestCommand.severity += ' success';
        
        if(construction) {
            this.latestCommand.start = this.compactTimeString;
            this.latestCommand.duration = toHHMMSS(duration);
        }
    }

    @api
    markAsRejected() {
        if(!this.latestCommand) return;
        
        this.latestCommand.severity += ' rejected';
        delete this.latestCommand.start;
        delete this.latestCommand.duration;
    }
    
    get latestCommand() {
        if(!this.logs?.findLast) {
            console.log(this.logs);
            return;
        }
        return this.logs.findLast(({isCommand}) => isCommand);
    }

    log(msgType, message, cssClass = '') {
        this.logs.push({
            id: this.idCounter++,
            command: this.commandCounter,
            settings: [],
            time: this.serverTimeString,
            msgType,
            message,
            cssClass});
    }

    handleMoveKeyInput(evt, step) {
        const id = this.commandId({target: this.template.activeElement});
        
        if(!isNaN(id)) {
            evt.preventDefault();
            evt.stopPropagation();
            this.moveCommandOneStep(id, step);
        }
    }

    handleSettingClick(evt) {
        const id = this.commandId(evt)
        this.pointer = id;
        this.dispatchEvent(new CustomEvent('settingclick', { detail: { id, action: evt.target.dataset.action } }));
    }

    remove(evt) {
        const id = this.commandId(evt);
        this.pointer = (this.reverse) ? id + 1 : id - 1;
        this.dispatchEvent(new CustomEvent('remove', { detail: {id} }));
    }

    startFrom(evt) {
        const id = this.commandId(evt);
        this.pointer = 0;
        this.dispatchEvent(new CustomEvent('startfrom', { detail: {id} }));
    }

    jumpTo(evt) {
        const id = this.commandId(evt);
        this.pointer = id;
        this.dispatchEvent(new CustomEvent('jumpto', { detail: {id} }));
    }

    duplicate(evt) {
        const id = this.commandId(evt);
        this.pointer = (this.reverse) ? id - 1 : id + 1;
        this.dispatchEvent(new CustomEvent('duplicate', { detail: {id} }));
    }

    up(evt) {
        this.moveCommandOneStep(this.commandId(evt), +1);
    }

    down(evt) {
        this.moveCommandOneStep(this.commandId(evt), -1);
    }
    
    moveCommandOneStep(commandIndex, step) {
        if(this.reverse) {
            step *= -1;
        }
        
        let newIndex = commandIndex + step;
        
        if(newIndex >= 0 && newIndex <= this.commandCounter) {
            this.pointer = newIndex;
            this.dispatchEvent(new CustomEvent('move', { detail: { commandIndex, newIndex } }));
        }
    }

    toEnd(evt) {
        const commandIndex = this.commandId(evt);
        const newIndex = (this.reverse) ? this.commandCounter : 0;
        
        this.pointer = newIndex;
        this.dispatchEvent(new CustomEvent('move', { detail: { commandIndex, newIndex } }));
    }

    toStart(evt) {
        const commandIndex = this.commandId(evt);
        const newIndex = (this.reverse) ? 0 : this.commandCounter;
        
        this.pointer = newIndex;
        this.dispatchEvent(new CustomEvent('move', { detail: { commandIndex, newIndex } }));
    }

    commandId(evt) {
        return parseInt(evt.target.closest('li').dataset.command);
    }

    startListening(account) {
        account.subscribe(E.RESOURCE_REQUEST, this.handleResourceRequest, account.current);
        account.subscribe(E.RESOURCE_CHANGE, this.handleResourceChange, account.current);
        account.subscribe(E.STARTED, this.handleTechnologyStart, account.current);
        account.subscribe(E.FINISHED, this.handleTechnologyFinish, account.current);
        account.subscribe(E.FAILED, this.handleFailed, account.current);
        account.subscribe(E.WAITING, this.updateServerTime);

        account.subscribe(E.EVENT_CHANGE, this.handleEventUpdate, account.current)
    }

    updateServerTime = ({total}) => {
        this.serverTime = this.startTime + total*1000;
    }

    handleEventUpdate = ({filter : {construction : {type, level}}, timeLeft, previous}) => {
        const changedCommand = this.logs.find(({message}) => message === `Starte ${type} ${level+1}`);
        const diff = previous - timeLeft;
        changedCommand && (changedCommand.duration = toHHMMSS(toSeconds(changedCommand.duration) - diff) + '*');
        
        this.log('UPDATE', `${type} (${toHHMMSS(previous)}) => (${toHHMMSS(timeLeft)})`, 'construction');
    }

    handleTechnologyStart = ({construction, duration}) => {
        this.markAsSucceeded(construction, duration);
        this.log('START', `${construction.type} ${construction.level+1} (${toHHMMSS(duration)})`, 'construction');
    }

    handleTechnologyFinish = ({construction: {type, level}}, coords) => {
        this.log('DONE ', `${coords} ${type} ${level}`, 'construction');
    }

    handleResourceRequest = ({resources}) => {
        // temporary Bierbaron fix
        if(this.latestCommand) {
            this.addWarning();
            this.latestCommand.needed = resources.toString();
        }
        else {
            console.log(this.logs)
        }
        
        this.log('NEED ', 'Benötigt: ' + resources.toString(), 'res');
    }

    handleResourceChange = ({resourceChanges}) => {
        const now = this.account.planet.resources.state.map(({stored}) => stored | 0);
        const changes = resourceChanges.toArray();
        const before = now.map((stored, i) => stored - +changes[i]);

        const changesString = changes.map((value) => (value > 0) ? '+'+value : value).join('|');

        this.log('RESS ', before.join('|') + ' => ' + changesString, 'res');
    }

    handleFailed = ({error}) => {
        this.markAsRejected();
        this.printError(error);
    }
    
    drag(evt) {
        const liElement = evt.currentTarget.closest('li');
        evt.dataTransfer.setData('command', liElement.dataset.command);
        
        const clone = liElement.cloneNode(false);
        clone.innerText = liElement.firstChild.childNodes[0].textContent;
        this.template.querySelector('ol.drag-image').appendChild(clone);
        
        evt.dataTransfer.setDragImage(clone, evt.offsetX, evt.offsetY);

        evt.currentTarget.classList.add('dragged');
    }

    dragEnd(evt) {
        evt.currentTarget.classList.remove('dragged');
        this.template.querySelector('ol.drag-image').innerHTML = "";
    }

    drop(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        const tec = evt.dataTransfer.getData('tec');
        const commandIndex = +evt.dataTransfer.getData('command');
        let newIndex = +evt.target.closest('li').dataset.command;
        
        if(tec || newIndex < commandIndex) {
            newIndex++;
        }
        
        this.pointer = newIndex;
        this.dispatchEvent(new CustomEvent('move', { detail:{ commandIndex, newIndex, tec } }));
    }

    allowDrop(evt) {
        evt.preventDefault();
    }

    get displayedLogs() {
        return this.logs.filter((log) => !this.hideDetails || log.isCommand).reverse();
    }
    
    get direction() {
        return (this.reverse) ? 'reverse' : '';
    }
    
    get startTimeString() {
        return dateTimeString(this.startTime);
    }

    get serverTimeString() {
        return dateTimeString(this.serverTime);
    }

    get compactTimeString() {
        return compactString(this.serverTime);
    }
}