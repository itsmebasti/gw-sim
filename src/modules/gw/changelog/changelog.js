import { LightningElement } from 'lwc';
import { CacheMixin } from 'lwc-base';
import Account from '../../../classes/model/infra/account';
import UNI, { accountState } from '../../../classes/model/infra/uni';

export default class Changelog extends CacheMixin(LightningElement) {
    reverse = false;
    inline = false;
    
    renderedCallback() {
        const account = new Account(accountState(UNI.default.NAME));
        const revertDemo = this.template.querySelector('gw-path-logger.revert');
        const inlineDemo = this.template.querySelector('gw-path-logger.inline');
        const resButtonDemo = this.template.querySelector('gw-path-logger.interaction');
        
        revertDemo.reset(account);
        inlineDemo.reset(account);
        resButtonDemo.reset(account);
        
        revertDemo.command('Starte Eisenmine 1');
        inlineDemo.command('Starte Eisenmine 1');
        resButtonDemo.command('Starte Eisenmine 1', [{ action: 'generateRes', tooltip: "Rostoffe werden selbst produziert", color:"yellow", icon: 'utility:clock' }]);
        account.completeAndEnqueue('Eisenmine');
        revertDemo.command('Starte Kommandozentrale 1');
        inlineDemo.command('Starte Kommandozentrale 1');
        resButtonDemo.command('Starte Kommandozentrale 1', [{ action: 'produceRes', tooltip: "Rostoffe werden anderweitig beschafft", color:"green", icon: 'utility:add' }]);
        account.completeAndEnqueue('Kommandozentrale');
    }
    
    toggleDirection(evt) {
        this.reverse = !this.reverse;
    }
    
    toggleInline(evt) {
        this.inline = !this.inline;
    }
}
