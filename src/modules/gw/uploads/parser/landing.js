import gwTimestamp from '../../../../classes/framwork/misc/gwTimestamp';
import { FACTORY } from '../../../../classes/model/static/types';

export default class Landing {
    uni;
    player;
    serverTime;
    currentResearch;
    nextBuilding;

    constructor(raw) {
        this.uni = raw.match(/https:\/\/([^.]+)\.gigrawars\.de/)?.[1];
        raw = raw.replaceAll(new RegExp('<img[^>]+src="([^">]+)".*>', 'g'), '');
        raw = raw.replaceAll(/gigrawars\.de/g, '');

        const tables = [...raw.matchAll(/<table.*?<\/table>/gs)];

        const serverInfo = document.createElement('p');
        const events = document.createElement('p');
        serverInfo.innerHTML = tables.shift();
        events.innerHTML = tables.pop();

        const firstBuilding = events.querySelector(".itemBuildingList")?.children;
        const researchRow = events.querySelector("span[data-page='game_research_index']")?.parentNode.parentNode.children;

        this.serverTime = gwTimestamp(serverInfo.querySelectorAll("td")[1].textContent);
        this.player = serverInfo.querySelector("b").textContent;

        if(researchRow) {
            this.currentResearch = {
                timeLeft: (gwTimestamp(researchRow[0].getAttribute("original-title")) - this.serverTime) / 1000,
                coords: researchRow[2].childNodes[1].dataset.coordinate,
                type: /.+?(?=Stufe)/.exec(researchRow[1].textContent)[0].trim(),
                factory: FACTORY.FZ
            };
        }

        // this.nextBuilding = {
        //     time: gwTimestamp(firstBuilding[0].getAttribute("original-title")),
        //     coords: firstBuilding[0].dataset.coordinate,
        // };
    }
}