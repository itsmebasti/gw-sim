import technologiesByType from '../../../../classes/model/static/technologies';
import { RES, NAMES, FACTORY } from '../../../../classes/model/static/types';
import { toSeconds } from '../../../../classes/framwork/misc/timeConverters';

export default class Overview {
    allCoords;
    rowByType = {};
    table;

    constructor(rawHtml) {
        this.table = document.createElement('p');
        this.table.innerHTML = [...rawHtml.matchAll(/<table.*?<\/table>/gs)][0];

        this.allCoords = [...this.table.querySelectorAll('tr:nth-child(2) :nth-child(n+2):nth-last-child(n+3)')]
                            .map((match) => match.innerHTML);
                            
        this.table.querySelectorAll('tr').forEach((trElement, index) => {
            const row = this.row(trElement, index);
            if(row.containsData()) {
                this.rowByType[row.type] = row;
            }
        });
    }

    get planets() {
        return this.allCoords.map((coords) => this.planet(coords));
    }

    planet(coords) {
        return {
            coords,
            current: [this.valueFor('Produktion', coords)].filter(Boolean),
            infra: {
                buildings: this.allValuesFor('buildings', coords),
                ships: this.allValuesFor('ships', coords),
                towers: this.allValuesFor('towers', coords)
            },
            resources: [
                { type: RES.FE, stored: this.valueFor(NAMES[RES.FE], coords) },
                { type: RES.LUT, stored: this.valueFor(NAMES[RES.LUT], coords) },
                { type: RES.H2O, stored: this.valueFor(NAMES[RES.H2O], coords) },
                { type: RES.H2, stored: this.valueFor(NAMES[RES.H2], coords) }
            ],
        };
    }

    buildingTimeLeft(coords, tempElement) {
        const index = this.allCoords.indexOf(coords);

        tempElement.appendChild(this.table); // Note: necessary to repect the new line in this cell
        const timeString = this.table.querySelector(`tr:nth-child(4) td:nth-of-type(${index+1})`).innerText.split('\n')[1];
        tempElement.innerHTML = '';

        return toSeconds(timeString);
    }

    row(trElement, index) {
        switch (index) {
            case 2: return new CurrentShipRow(trElement);
            default: return new Row(trElement);
        }
    }

    allValuesFor(group, coords) {
        return technologiesByType[group].reduce((result, type) => (result[type] = this.valueFor(type, coords), result), {});
    }

    valueFor(type, coords) {
        return this.rowByType[type].get(this.allCoords.indexOf(coords));
    }
}

class Row {
    trElement;

    constructor(trElement) {
        this.trElement = trElement;
    }

    containsData() {
        return (this.trElement.querySelectorAll('td').length > 0);
    }

    get type() {
        return this.trElement.querySelector('th').innerText;
    }

    get(index) {
        let content = this.trElement.querySelector(`td:nth-of-type(${index+1})`).innerText;
        return parseInt(content.replaceAll('\.', '').replace('-', '0'));
    }
}

class CurrentShipRow extends Row {
    constructor(trElement) {
        super(trElement);
    }

    get(index) {
        const ship = this.trElement.querySelector(`td:nth-of-type(${index+1}) span`)?.getAttribute('original-title');

        if(ship) {
            const [all, amount, type, timeString] = /aktuell (\d+) (.*) Dauer (.*)/.exec(ship);

            return {
                type,
                factory: FACTORY.SF,
                amount: +amount,
                timeLeft: toSeconds(timeString)
            };
        }
        else {
            return undefined;
        }
    }
}