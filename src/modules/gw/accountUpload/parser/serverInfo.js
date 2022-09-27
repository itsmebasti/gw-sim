import { gwToMilliseconds } from '../../../../classes/framwork/misc/timeConverters';

export default class ServerInfo {
    uni;
    player;
    serverTime;

    constructor(raw) {
        this.uni = raw.match(/https:\/\/([^.]+)\.gigrawars\.de/)[1];

        const serverInfo = document.createElement('p');
        serverInfo.innerHTML = raw.match(/<table.*?<\/table>/s)[0];

        this.serverTime = gwToMilliseconds(serverInfo.querySelector("td:nth-child(2)").textContent);
        this.player = serverInfo.querySelector("b").textContent;
    }
}