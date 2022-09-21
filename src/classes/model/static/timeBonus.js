export default function(kzFzSf) {
    return 1/(kzFzSf+(((kzFzSf-2)/2*(kzFzSf-1))*0.5)+((kzFzSf-Math.floor((kzFzSf-1)/5)*2.5-2.5)*Math.floor((kzFzSf-1)/5)*2.5)/5);
}