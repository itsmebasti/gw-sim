import { LightningElement, api } from 'lwc';

export default class PlanetSelector extends LightningElement {
    @api planets = [];
    @api selected;
    
    changePlanet({ detail : coords }) {
        this.select(this.planets.indexOf(coords));
    }

    @api next(evt) {
        let next = this.currentIndex() + 1;
        
        if(next >= this.planets.length) {
            next = 0;
        }
        
        this.select(next);
    }

    @api previous(evt) {
        let prev = this.currentIndex() - 1;
        
        if(prev < 0) {
            prev = this.planets.length-1;
        }
        
        this.select(prev);
    }
    
    select(index) {
        this.selected = this.planets[index];
        this.template.querySelector('base-select').selectedIndex = index;
        
        this.dispatchEvent(new CustomEvent('select'));
    }
    
    currentIndex() {
        return this.planets.indexOf(this.selected);
    }
}