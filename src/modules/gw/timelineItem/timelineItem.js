
import { LightningElement, api } from 'lwc';

export default class TimelineItem extends LightningElement {
    @api open = false;
    @api label;
    @api date;
    @api icon;
    
    toogle(evt) {
        this.open = !this.open;
    }
    
    get itemClass() {
        return 'slds-timeline__item_expandable' + (this.open ? ' slds-is-open' : '');
    }
}