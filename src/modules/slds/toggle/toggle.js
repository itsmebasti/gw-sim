import SldsWebComponent from "../../../classes/framwork/misc/sldsWebComponent";
import { api } from 'lwc';

export default class Toggle extends SldsWebComponent {
    @api checked = false;
    
    @api label;
    @api whenOn;
    @api whenOff;
    
    bubble(evt) {
        this.dispatchEvent(new CustomEvent('change', {detail: !this.checked}))
    }
}