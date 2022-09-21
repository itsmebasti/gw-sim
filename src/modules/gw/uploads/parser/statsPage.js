export default class StatsPage {
    raw;
    resByCoords = {};
    
    constructor(raw) {
        this.raw = raw;
        const ships = this.substring('Rohstoffe in Schiffsproduktion', 'Rohstoffe in Verteidigungsproduktion');
        const towers = this.substring('Rohstoffe in Verteidigungsproduktion', 'Flotten von anderen Spielern');
    
        this.add(ships);
        this.add(towers);
    }
    
    resFor(coords) {
        return this.resByCoords[coords];
    }
    
    add(table) {
        const rows = table.split('\n');
        rows.filter((row) => /^\d{1,3}:\d{1,3}:\d{1,3}.*/.test(row))
            .forEach((row) => {
            const values = row.split('\t');
            const coords = values[0].trim();
            const res = values.splice(1).map((value) => this.num(value));
            
            this.resByCoords[coords] = res.map((value, i) => value + (this.resByCoords[coords]?.[i] ?? 0));
        });
    }
    
    substring(start, end = '\n') {
        const from = this.raw.indexOf(start) + (start).length;
        const toEnd = this.raw.substring(from);
        const to = from + toEnd.indexOf(end);
        
        return this.raw.substring(from, to);
    }
    
    num(formattedNumber) {
        return (typeof formattedNumber === 'string')
            ? Number(formattedNumber.replaceAll('.', ''))
            : formattedNumber
    }
}