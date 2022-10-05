import { LightningElement, track } from 'lwc';
import { CacheMixin } from 'lwc-base';
import Account from '../../../classes/model/infra/account';
import UNI, { accountState } from '../../../classes/model/infra/uni';

export default class Settings extends CacheMixin(LightningElement) {
    @track cache = this.cached({
        darkmode: true,
        reverse: false
    });
    
    renderedCallback() {
        const account = new Account(accountState(UNI.default.NAME));
        const logger = this.template.querySelector('gw-path-logger');
        
        logger.reset(account);
        logger.command('Starte Eisenmine 1');
        account.completeAndEnqueue('Eisenmine');
        logger.command('Starte Lutinumraffinerie 1');
        account.completeAndEnqueue('Lutinumraffinerie');
    }
    
    toggleDirection(evt) {
        this.cache.reverse = !this.cache.reverse;
        this.dispatchEvent(new CustomEvent('pathdirectionchange', {detail: this.cache.reverse}));
        
    }
    
    toggleTheme(evt) {
        this.cache.darkmode = !this.cache.darkmode;
        this.dispatchEvent(new CustomEvent('themechange', {detail: this.cache.darkmode}));
    }
}
