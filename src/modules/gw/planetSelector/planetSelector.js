import { LightningElement, api } from 'lwc';

export default class PlanetSelector extends LightningElement {
    @api planets = [];
    @api selected;
    
    changePlanet({ detail : coords }) {
        this.selected = coords;
        this.dispatchEvent(new CustomEvent('select'));
    }

    @api next(evt) {
        let next = this.planets.indexOf(this.selected) + 1;
        
        if(next >= this.planets.length) {
            next = 0;
        }
        
        this.selected = this.planets[next];
        this.dispatchEvent(new CustomEvent('select'));
    }

    @api previous(evt) {
        let prev = this.planets.indexOf(this.selected) - 1;
        
        if(prev < 0) {
            prev = this.planets.length-1;
        }
        
        this.selected = this.planets[prev];
        this.dispatchEvent(new CustomEvent('select'));
    }
}