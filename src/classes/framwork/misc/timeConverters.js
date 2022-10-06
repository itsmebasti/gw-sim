export function gwToMilliseconds(dateString) {
    const val = /(\d+)\.(\d+)\.(\d+) - (\d+):(\d+):(\d+)/.exec(dateString);
    return new Date(val[3], Number(val[2])-1, val[1], val[4], val[5], val[6]).getTime();
}

export function toSeconds(timeString) {
    const [all, days = 0, hours = 0, minutes = 0, seconds = 0] = /(?:(\d+) Tage?, )?(\d*):(\d{2}):(\d{2})/.exec(timeString);
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

export function dateString(datetime) {
    return (datetime) ? new Date(datetime.getTime() - (datetime.getTimezoneOffset() * 60000)).toISOString().slice(0, 10) : '';
}

export function timeString(datetime) {
    return datetime?.toLocaleTimeString('de-DE');
}

export function dateTimeString(milliseconds) {
    const date = new Date(milliseconds);
    
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', second: 'numeric' };

    return date.toLocaleDateString('de-DE', options);
}

export function compactString(milliseconds) {
    const date = new Date(milliseconds);
    return `${date.getMonth()+1}.${date.getDate()} ${timeString(date)}`;
}