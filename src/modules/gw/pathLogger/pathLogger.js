import { LightningElement, api, track } from 'lwc';
import { toHHMMSS } from '../../../classes/framwork/misc/timeConverters';
import { E } from '../../../classes/model/static/types';

const DIRECTION = { UP: Symbol(), DOWN: Symbol() };

export default class PathLogger extends LightningElement {
    @api hideDetails = false;
    @track logs = [];
    @api reverse;
    account
    serverTime;
    start;

    idCounter;
    commandCounter;
    lastKeyMove;

    connectedCallback() {
        document.addEventListener('keydown', (evt) => {
            if (!evt.ctrlKey) {
                switch(evt.key) {
                    case 'ArrowUp': case 'w': case 'W':
                        this.move(evt, DIRECTION.UP);
                        break;
                    case 'ArrowDown': case 's': case 'S':
                        this.move(evt, DIRECTION.DOWN);
                        break;
                }
            }
        });
    }

    renderedCallback() {
        if(this.lastKeyMove !== undefined) {
            this.template.querySelector(`li.command[data-command='${this.lastKeyMove}'] div`)?.focus();
            this.lastKeyMove = undefined;
        }
    }

    @api
    reset(account) {
        this.start = account.serverTime;
        this.account = account;
        this.logs = [];
        this.idCounter = 0;
        this.commandCounter = -1;
        this.startListening(account);
        this.setServerTime();
    }

    @api
    command(message, settings = []) {
        this.logs.unshift({
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
        details.reverse().forEach((detail) => {
            this.logs.unshift({
                id: this.idCounter++,
                command: this.commandCounter,
                settings: [],
                message: detail,
                isDetail: true,
                cssClass: 'detail'});
        });

        this.log('ERROR', message, 'error');
    }

    log(msgType, message, cssClass = '') {
        this.logs.unshift({
            id: this.idCounter++,
            command: this.commandCounter,
            settings: [],
            time: this.serverTime,
            msgType,
            message,
            cssClass});
    }

    get displayedLogs() {
        return this.logs.filter((log) => !this.hideDetails || log.isCommand);
    }

    clear() {
        this.logs = [];
    }

    move(evt, direction) {
        const liElement = this.template.activeElement?.parentElement;
        const command = +liElement?.dataset.command;
        const earlier = (direction === (this.reverse ? DIRECTION.UP : DIRECTION.DOWN));

        if(!isNaN(command)) {
            evt.preventDefault();
            evt.stopPropagation();
            this.dispatchEvent(new CustomEvent('move', { detail:{ id: command, dropAt: command + ((earlier) ? -2 : 1) } }));
            this.lastKeyMove = (earlier) ? command-1 : command+1;
        }
    }

    handleSettingClick(evt) {
        this.dispatchEvent(new CustomEvent('settingclick', { detail: { action: evt.target.dataset.action, id: this.commandId(evt) } }));
    }

    remove(evt) {
        this.dispatchEvent(new CustomEvent('remove', { detail: { id: this.commandId(evt) } }));
    }

    jumpTo(evt) {
        this.dispatchEvent(new CustomEvent('jumpto', { detail: { id: this.commandId(evt) } }));
    }

    duplicate(evt) {
        this.dispatchEvent(new CustomEvent('duplicate', { detail: { id: this.commandId(evt) } }));
    }

    up(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('move', { detail: { id, dropAt: id+1 } }));
    }

    down(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('move', { detail: { id, dropAt: id-2 } }));
    }

    toEnd(evt) {
        const id = this.commandId(evt);
        this.dispatchEvent(new CustomEvent('move', { detail: { id, dropAt: -1 } }));
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
        account.subscribe(E.WAITING, this.setServerTime);

        account.subscribe(E.EVENT_CHANGE, this.handleEventUpdate, account.current)
    }

    setServerTime = ({total = 0} = {}) => {
        this.serverTime = this.localeString(new Date(this.start + total * 1000));
    }

    get startTime() {
        return this.localeString(new Date(this.start))
    }

    handleEventUpdate = ({filter : {construction : {type}}, timeLeft, previous}) => {
        this.log('UPDATE', `${type} (${toHHMMSS(previous)}) => (${toHHMMSS(timeLeft)})`, 'construction');
    }

    handleTechnologyStart = ({construction: {type, level}, duration}) => {
        this.markAsSucceeded();
        this.log('START', `${type} ${level+1} (${toHHMMSS(duration)})`, 'construction');
    }

    handleTechnologyFinish = ({construction: {type, level}}, coords) => {
        this.log('DONE ', `${coords} ${type} ${level}`, 'construction');
    }

    handleResourceRequest = ({resources}) => {
        this.addWarning();
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

    @api
    addWarning() {
        this.addSeverity('warning');
    }

    @api
    markAsSucceeded() {
        this.addSeverity('success');
    }

    @api
    markAsRejected() {
        this.addSeverity('rejected');
    }

    addSeverity(severity) {
        this.logs.find(({isCommand}) => isCommand).severity += ' ' + severity;
    }

    localeString(date) {
        const options = {  year: 'numeric',
            month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', second: 'numeric' };

        return date.toLocaleDateString('de-DE', options);
    }

    drag(evt) {
        const li = evt.currentTarget;
        evt.dataTransfer.setData('command', li.dataset.command);
        const dragImage = this.template.querySelector('ol.temp').appendChild(li.cloneNode(true));
        dragImage.classList.add('drag-image');
        evt.dataTransfer.setDragImage(dragImage, evt.offsetX, evt.offsetY);

        li.classList.add('dragged');
    }

    dragEnd(evt) {
        evt.currentTarget.classList.remove('dragged');
        this.template.querySelector('.drag-image').remove();
    }

    drop(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        const id = parseInt(evt.dataTransfer.getData('command') ?? this.commandCounter);
        const dropAt = parseInt(evt.currentTarget.dataset.command ?? -1);
        const tec = evt.dataTransfer.getData('tec');
        this.dispatchEvent(new CustomEvent('move', { detail:{ id, dropAt, tec } }));
    }

    allowDrop(evt) {
        evt.preventDefault();
    }
    
    get direction() {
        return (this.reverse) ? 'reverse' : '';
    }
}