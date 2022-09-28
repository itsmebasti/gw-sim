export function gwToMilliseconds(dateString) {
    const val = /(\d+)\.(\d+)\.(\d+) - (\d+):(\d+):(\d+)/.exec(dateString);
    return new Date(val[3], Number(val[2])-1, val[1], val[4], val[5], val[6]).getTime();
}

export function toSeconds(timeString) {
    const [all, days = 0, hours = 0, minutes = 0, seconds = 0] = /(?:(\d+) Tage?, )?(\d{2}):(\d{2}):(\d{2})/.exec(timeString);
    return (+days * 24 * 3600) + (+hours * 3600) + (+minutes * 60) + (+seconds);
}

export function toHHMMSS(secs) {
    var sec_num = parseInt(secs, 10)
    var hours   = Math.floor(sec_num / 3600)
    var minutes = Math.floor(sec_num / 60) % 60
    var seconds = sec_num % 60

    return [hours, minutes, seconds]
        .map(v => v < 10 ? "0" + v : v)
        .join(":")
}