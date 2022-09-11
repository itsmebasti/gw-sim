import { LightningElement, track, api } from 'lwc';
import { CacheMixin } from '../../../classes/framwork/cache/cache';

export default class AccordionSection extends CacheMixin(LightningElement) {
    @api open = false;
    @api label;

    get classes() {
        return 'slds-accordion__section ' + (this.open ? 'slds-is-open' : '');
    }

    get icon() {
        return '/assets/icons/utility-sprite/svg/symbols.svg#switch';
    }

    toggle(evt) {
        this.open = !this.open;
    }
}
