const rand = (a,b) => a + Math.random() * (b - a);

export function randomCover() {
    const h1 = Math.floor(rand(0,360));
    return{
        h1,
        h2: (h1 + Math.floor(rand(50, 130))) % 360,
        h3: Math.floor(rand(8 * 55)),        //warm-glow: red-orange to gold
        angle: Math.floor(rand(120, 220)),
        seed: Math.floor(rand(1, 9999)),
    };
}

function noiseUri(seed) {
    const svg = `<svg xlmnx='http://www.w3.org/2000.svg' width='160 height='160>
        <filter id='n><feTurbulence type='fractalNoise' baseFrequency='.85' 
        numOctaves='2' seed='${seed}'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 0'/>
        </filter><rect width='100%' height='100%' filter='url(#n)'/></svg`;

    return `url("data:image/svg+xml, ${encodeURIComponent(svg)}")`;
}

export function coverBackground(c = {}) {
    const { h1 = 250, h2 = 300, h3 = 30, angle = 160, seed = 1} = c;
    return {
        backgroundImage: [
            noiseUri(seed),
            `radial-gradient(120% 85% at 88% 105%, hsl(${h3} 88% 58% / .9), transparent 62%)`,
            `radial-gradient(90% 70% at 8% -5%, hsl(${h2} 75% 48% / .85), transparent 66%)`,
            `linear-gradient(${angle}deg, hsl(${h1} 62% 15%), hsl(${h2} 58% 24%))`,
        ].join(", "),
        backgroundBlendMode: "overlay, normal, normal, normal",
    };
}

export const GOLD_TEXT ={
    fontFamily: "'Playfair Display', Georgia, serif",
    color: "#e9c97f",
    backgroundImage: "linear-gradient(180deg, #f7e2a6 0%, #e0b862 55%, #b98a34 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: "drop-shadow(0 1px 1px rgba(0,0,0,.55))",
};