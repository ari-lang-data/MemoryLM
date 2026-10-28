import { coverBackground, GOLD_TEXT } from "../lib/lorebookCover";

export default function LorebookCover({ cover, title, chidren, style, ...rest }) {
    return (
        <div {...rest} style={{
            position: "relative", aspectRatio: "4 / 5", containerType: "inline-size", 
            borderRadius: "4px 9px 9px 4px", overflow: "hidden", 
            boxShadow: "0 6px 18px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.06)",
            ...coverBackground(cover), ...style,
        }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "5%", background: "linear-gradient(90deg, rgba(0,0,0,.45), rgba(255,255,255,.07) 45%, rgba(0,0,0,.25)" }}/>
            <div style={{ position: "absolute", inset: "6% 6% 6% 9%", border: "1px solid rgba(238,201,127,.35)", borderRadius: 3, pointerEvents: "none" }}/>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "14% 14% 14% 17%", textAlign: "center" }}>
                <span style={{ ...GOLD_TEXT, fontSize: "10.5cqw", lineHeight: 1.15, fontWeight: 500, overflowWrap: "anywhere" }}>{title}</span>
            </div>
            {chidren}
        </div>
    );
}