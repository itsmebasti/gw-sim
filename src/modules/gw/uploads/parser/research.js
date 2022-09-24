import technologiesByType from '../../../../classes/model/static/technologies';

export default class Research {
    table;

    constructor(rawHtml) {
        this.table = document.createElement('p');
        this.table.innerHTML = [...rawHtml.matchAll(/<table.*?<\/table>/gs)][0];
    }

    plain() {
        const result = technologiesByType.research.reduce((result, type) => (result[type] = 0, result), {});

        this.table.querySelectorAll('.itemname').forEach(({innerText}) => {
            const [type, level] = innerText.replace('\n', '').trim().split(/\sStufe\s/gs);
            result[type] = parseInt(level);
        });

        return result;
    }
}