import { api } from 'lwc';
import SldsWebComponent from "../../../classes/framwork/misc/sldsWebComponent";

export default class FleetSummary extends SldsWebComponent {
    @api fleet = {}
    
    get arrivalDate() {
        return (this.fleet.arrival) ? new Date(this.fleet.arrival * 1000).toLocaleString() : "";
    }
    
    get returningDate() {
        return (this.fleet.returning) ? new Date(this.fleet.returning * 1000).toLocaleString() : "";
    }
    
    get cssClass() {
        return ((this.fleet.returning && this.fleet.returning*1000 < Date.now()) ? " slds-item slds-theme_shade slds-theme_alert-texture" :
                (this.fleet.arrival && this.fleet.arrival*1000 < Date.now()) ? " slds-item slds-theme_shade" : " slds-item");
    }
}