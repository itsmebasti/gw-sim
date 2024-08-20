# gw-sim
Dies ist ein Simulator für das Browser Game https://www.gigrawars.de/

Aktuell wird das projekt gratis in der google cloud gehosted:

https://gw-simulator.ey.r.appspot.com

## lokale Umgebung mit docker-env & gw-sim
Wer lokal kein Node installieren möchte, kann die enthaltene Docker-Umgebung nutzen.

Lokale Docker-Umgebung kann über `gw-sim` gestartet werden. Der erste Start baut einen geeigneten Container.
```
./gw-sim start
```

Nach dem ersten Start müssen alle notwendigen Abhängigkeiten installiert werden.
```
./gw-sim install
```

Um den Node-Prozess zu starten können wir folgenden Befehl über `gw-sim` ausführen.
```
./gw-sim local
```
Simulator ist anschließend im Browser erreichbar über http://localhost:3001.

Weitere Befehle:
* `gw-sim start` - startet die lokale Umgebung
* `gw-sim stop` - stoppt die lokale Umgebung
* `gw-sim exec [CMD]` - führt `[CMD]` im Container aus
* `gw-sim install` - installiert alle notwendigen Abhängikeiten via `yarn`
* `gw-sim build` - alias für `gw-sim exec npm run build`
* `gw-sim watch` - alias für `gw-sim exec npm run watch`
* `gw-sim local` - alias für `gw-sim exec npm run local`