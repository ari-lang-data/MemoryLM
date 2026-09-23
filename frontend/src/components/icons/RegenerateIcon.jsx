export default function RegenerateIcon ( {size = 24, strokeWidth = 2.2, color = "var(--color-text-primary)", style}){ 
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="-2 -3 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
            >
            <path d="M12 4a8 8 0 1 1-11.5 3" />
            <polyline points="10,8 10,2 15.5,2" />
            </svg>
          )
}