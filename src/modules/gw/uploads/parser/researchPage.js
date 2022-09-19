import technologiesByType from '../../../../classes/model/static/technologies';

export default class ResearchPage {
    raw;

    constructor(raw) {
        this.raw = raw;
    }

    plain() {
        return technologiesByType.research.reduce((result, type) => {
            result[type] = this.researchFor(type);
            return result;
        }, {});
    }

    researchFor(type) {
        const regex = new RegExp(type + " Stufe (\\d+)");
        return parseInt(regex.exec(this.raw)?.[1] ?? 0);
    }
}