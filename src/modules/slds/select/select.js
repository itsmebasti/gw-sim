import SldsWebComponent from "../../../classes/framwork/misc/sldsWebComponent";
import { api } from 'lwc';

export default class Select extends SldsWebComponent {
    @api label;
    @api value;
    _options;
    
    bubble(evt) {
        this.dispatchEvent(new CustomEvent('change', {detail: evt.target.value}))
    }
    
    @api set selectedIndex(index) {
        this.template.querySelector('select').selectedIndex = index;
    }
    
    get selectedIndex() {
        return this.template.querySelector('select').selectedIndex;
    }
    
    @api set options(value) {
        this._options = value;
    }
    
    get options() {
        return this._options?.map((option) => ({
            value: option,
            selected: (option === this.value)
        })) ?? [];
    }
}