import technologiesByType from '../../../../classes/model/static/technologies';
import { RES, NAMES, FACTORY } from '../../../../classes/model/static/types';

export default class OverviewPage {
    rawHtml;
    rawText;
    planets;
    
    constructor(rawText, rawHtml) {
        this.rawText = rawText;
        this.rawHtml = rawHtml;
        
        this.planets = this.substring('Planet\t', '\tFlotten').split('\t');
    }
    
    shipQueue() {
        const result = {};
        const table = this.table;
    
        const prod = table.querySelector('tr:nth-child(3)');
    
        [...prod.querySelectorAll('td')].forEach((td, index) => {
            const ship = td.querySelector('span')?.getAttribute('original-title');
            
            if(ship) {
                // Todo: improve
                const type = /aktuell (\d+) (.*) Dauer/.exec(ship)[2];
                const amount = Number(/aktuell (\d+) (.*) Dauer/.exec(ship)[1]);
                const timeLeft = this.toSeconds(ship);
    
                result[this.planets[index]] = { type, amount, timeLeft, factory: FACTORY.SF };
            }
        });
    
        return result;
    }
    
    toSeconds(string) {
        // TODO: mit tagen testen
        const prod = /Dauer( (\d+) Tage?,)? (.*)/.exec(string);
        const time = this.timeToSeconds(prod[3]);
        const days = prod[2] || 0;
        
        return time + days * 24 * 3600;
    }
    
    toInfra(coords) {
        return {
            buildings: this.get('buildings', coords),
            ships: this.get('ships', coords),
            towers: this.get('towers', coords)
        };
    }
    
    get(type, coords) {
        return this.toObject(technologiesByType[type], coords);
    }
    
    currentBuilding(coords) {
        let result = {};
        
        const buildingsString = this.substring('Gebäude\t', '\nPunkte');
        const currentBuilding = buildingsString.split('\t')[this.indexOf(coords)];
        
        if (currentBuilding !== '-') {
            const lines = currentBuilding.split('\n');
            const type = new RegExp('(.*) Stufe').exec(lines[0])[1];
            const time = new RegExp('\\d+:\\d+:\\d+').exec(lines[1])[0];
            
            let timeLeft = this.timeToSeconds(time);
            
            const days = new RegExp('(\\d+) Tag').exec(lines[1]);
            if (days) {
                timeLeft += (days[1] * 24 * 3600);
            }
            
            result = { type, timeLeft, factory: FACTORY.KZ };
        }
        
        return result;
    }
    
    
    timeToSeconds(string) {
        const a = string.split(':');
        return (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
    }
    
    
    toResoures(coords) {
        return [
            { type: RES.FE, stored: this.valueFor(coords, NAMES[RES.FE]) },
            { type: RES.LUT, stored: this.valueFor(coords, NAMES[RES.LUT]) },
            { type: RES.H2O, stored: this.valueFor(coords, NAMES[RES.H2O]) },
            { type: RES.H2, stored: this.valueFor(coords, NAMES[RES.H2]) }
        ];
    }
    
    
    get table() {
        const result = document.createElement('p');
        result.innerHTML = [...this.rawHtml.matchAll(/<table.*?<\/table>/gs)][0];
        
        return result;
    }
    
    
    toObject(types, coords) {
        return types.reduce((result, type) => {
            const value = this.valueFor(coords, type);
            if (value > 0) {
                result[type] = value;
            }
            return result;
        }, {});
    }
    
    
    valueFor(coords, type) {
        return this.values(type)[this.indexOf(coords)];
    }
    
    
    indexOf(coords) {
        return this.planets.indexOf(coords);
    }
    
    
    values(type) {
        const levelsRaw = this.substring(type + '\t');
        
        return levelsRaw.split('\t')
            .map((valueRaw) => {
                if (valueRaw.indexOf('\w') > 0) {
                    return valueRaw.substring(0, valueRaw.indexOf('\w'));
                }
                return valueRaw;
            })
            .map((valueRaw) => valueRaw.replaceAll('\.', ''))
            .map((valueRaw) => valueRaw.replace('-', '0'))
            .map((valueRaw) => parseInt(valueRaw));
    }
    
    
    substring(start, end = '\n') {
        const from = this.rawText.indexOf(start) + (start).length;
        const toEnd = this.rawText.substring(from);
        const to = from + toEnd.indexOf(end);
        
        return this.rawText.substring(from, to);
    }
}