import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function Logo({ size = 32, className, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={`select-none ${className || ""}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
      {...props}
    >
      {/* Sky Blue Flame/Leaf-like element on the left */}
      <path
        d="M148,25 
           C125,58 90,125 70,195 
           C52,258 46,315 58,345 
           C68,370 88,360 102,330 
           C135,260 168,165 185,98 
           C192,72 178,45 148,25 Z"
        fill="#2CB0E1"
      />
      {/* Deep Blue hand/bird/wave element on the right */}
      <path
        d="M85,385 
           C145,355 220,310 285,245 
           C328,202 365,150 380,95 
           C382,90 376,85 370,90 
           C345,110 318,118 288,110 
           C255,102 232,82 205,95 
           C182,106 160,135 130,170 
           C100,205 82,248 76,288 
           C72,310 84,315 95,295 
           C118,255 145,218 175,190 
           C190,176 205,162 220,150 
           C228,144 235,150 231,158 
           C212,194 184,236 152,280 
           C120,324 98,362 85,385 Z"
         fill="#014A75"
      />
    </svg>
  );
}
