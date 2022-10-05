import { LightningElement } from 'lwc';
import { CacheMixin } from 'lwc-base';
import Account from '../../../classes/model/infra/account';
import UNI, { accountState } from '../../../classes/model/infra/uni';

export default class Changelog extends CacheMixin(LightningElement) {
    reverse = false;
    
    renderedCallback() {
        const account = new Account(accountState(UNI.default.NAME));
        const revertDemo = this.template.querySelector('gw-path-logger.revert');
        const resButtonDemo = this.template.querySelector('gw-path-logger.interaction');
        
        revertDemo.reset(account);
        resButtonDemo.reset(account);
        
        revertDemo.command('Starte Eisenmine 1');
        resButtonDemo.command('Starte Eisenmine 1', [{ action: 'generateRes', tooltip: "Rostoffe werden selbst produziert", color:"yellow", icon: 'utility:clock' }]);
        account.completeAndEnqueue('Eisenmine');
        revertDemo.command('Starte Lutinumraffinerie 1');
        resButtonDemo.command('Starte Lutinumraffinerie 1', [{ action: 'produceRes', tooltip: "Rostoffe werden anderweitig beschafft", color:"green", icon: 'utility:add' }]);
        account.completeAndEnqueue('Lutinumraffinerie');
    }
    
    toggleDirection(evt) {
        this.reverse = !this.reverse;
    }
}
