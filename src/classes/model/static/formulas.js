export function timeBonus(kzFzSf) {
    return 1/(kzFzSf+(((kzFzSf-2)/2*(kzFzSf-1))*0.5)+((kzFzSf-Math.floor((kzFzSf-1)/5)*2.5-2.5)*Math.floor((kzFzSf-1)/5)*2.5)/5);
}
    
// Credits gehen raus an Frendor, fürs knacken dieser Formel!
export function frendorFactor(level) {
    return ((level**3) + 20 - [0, 1, 8, 7, 4, 5, 6, 3, 2, 9][(level%10)]) / 20;
}