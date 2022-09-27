export default class ResourceStats {
    shipProdTable;
    towerProdTable;

    constructor(rawHtml) {
        const [all, planet, shipProd, towerProd] = [...rawHtml.matchAll(/<table.*?<\/table>/gs)];
        this.shipProdTable = document.createElement('p');
        this.towerProdTable = document.createElement('p');
        this.shipProdTable.innerHTML = shipProd;
        this.towerProdTable.innerHTML = towerProd;
    }

    queueResources() {
        const resByCoords = {};

        this.add(this.shipProdTable, resByCoords);
        this.add(this.towerProdTable, resByCoords);

        return Object.keys(resByCoords).map((coords) => ({coords, queueRes: resByCoords[coords]}));
    }

    add(table, resByCoords) {
        table.querySelectorAll('tr:nth-child(n+2):nth-last-child(n+3)')
            .forEach((row) => {
                const [coords, ...res] = [...row.querySelectorAll('td')].map((td) => td.innerText);

                resByCoords[coords] = res.map((value, i) => parseInt(value.replaceAll('\.', '')) + (resByCoords[coords]?.[i] ?? 0));
            });
    }
}