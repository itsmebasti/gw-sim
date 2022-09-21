export default function gwTimestamp(dateString) {
    const val = /(\d+)\.(\d+)\.(\d+) - (\d+):(\d+):(\d+)/.exec(dateString);
    return new Date(val[3], Number(val[2])-1, val[1], val[4], val[5], val[6]).getTime();
}