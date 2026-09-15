import { useId } from "react";
export default function Shirt({
  name = "SEU NOME",
  number = "07",
  back = false,
  long = false,
}: {
  name?: string;
  number?: string;
  back?: boolean;
  long?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const shape = long
    ? "M110 58 L155 40 Q200 67 245 40 L290 58 L349 292 L299 307 L267 159 L273 379 Q200 398 127 379 L133 159 L101 307 L51 292 Z"
    : "M110 58 L155 40 Q200 67 245 40 L290 58 L338 159 L283 184 L266 145 L273 379 Q200 398 127 379 L134 145 L117 184 L62 159 Z";
  return (
    <svg
      viewBox="0 0 400 430"
      role="img"
      aria-label={`Ilustração da camisa, ${back ? "costas" : "frente"}`}
    >
      <defs>
        <clipPath id={id}>
          <path d={shape} />
        </clipPath>
        <linearGradient id={`${id}shine`}>
          <stop stopColor="#000" stopOpacity=".6" />
          <stop offset=".4" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#000" stopOpacity=".6" />
        </linearGradient>
      </defs>
      <path d={shape} fill="#0c1421" />
      <g clipPath={`url(#${id})`}>
        <path
          d="M104 20H137V420H104ZM164 20H197V420H164ZM224 20H257V420H224ZM284 20H317V420H284Z"
          fill="#1857a8"
        />
        <path
          d="M230 62L300 15L327 49L237 113ZM231 127L338 59L357 84L239 178ZM233 193L365 105L376 137L240 242ZM235 255L336 189L349 222L243 297ZM235 316L303 271L320 301L244 355Z"
          fill="#09131f"
        />
        <path d={shape} fill={`url(#${id}shine)`} />
      </g>
      <path
        d="M154 41Q200 70 246 41L238 65Q200 89 162 65Z"
        fill="#080c10"
        stroke="#364049"
        strokeWidth="2"
      />
      {back ? (
        <g fill="#f3f0db" textAnchor="middle">
          <text x="200" y="121" fontSize="22" fontWeight="700">
            {name}
          </text>
          <text
            x="200"
            y="271"
            fontSize="138"
            fontWeight="800"
            letterSpacing="-8"
          >
            {number}
          </text>
          <text x="200" y="318" fontSize="27" fontWeight="700">
            PSCJ
          </text>
        </g>
      ) : (
        <g fill="#f3f0db" textAnchor="middle">
          <text x="160" y="129" fontSize="29">
            ✝
          </text>
          <text
            x="237"
            y="127"
            fontSize="24"
            fontWeight="800"
            fontStyle="italic"
          >
            EJC
          </text>
          <circle
            cx="200"
            cy="172"
            r="23"
            fill="none"
            stroke="#e7e3d0"
            strokeWidth="2"
          />
          <path d="M200 153V191M184 165H216" stroke="#e7e3d0" strokeWidth="3" />
          <text x="200" y="226" fontSize="17" fontWeight="800">
            MINISTÉRIO
          </text>
          <text x="200" y="247" fontSize="17" fontWeight="800">
            DO ESPORTE
          </text>
        </g>
      )}
      <path
        d="M130 370Q200 387 270 370"
        fill="none"
        stroke="#7e8ba0"
        strokeOpacity=".3"
      />
    </svg>
  );
}
