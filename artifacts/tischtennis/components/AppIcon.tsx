import React from "react";
import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: unknown;
};

const strokeProps = (color: string) => ({
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

function glyph(name: string, color: string) {
  switch (name) {
    case "arrow-back":
      return <><Line x1="19" y1="12" x2="5" y2="12" {...strokeProps(color)} /><Polyline points="12 19 5 12 12 5" {...strokeProps(color)} /></>;
    case "arrow-down":
      return <><Line x1="12" y1="5" x2="12" y2="19" {...strokeProps(color)} /><Polyline points="19 12 12 19 5 12" {...strokeProps(color)} /></>;
    case "arrow-forward":
      return <><Line x1="5" y1="12" x2="19" y2="12" {...strokeProps(color)} /><Polyline points="12 5 19 12 12 19" {...strokeProps(color)} /></>;
    case "arrow-forward-circle":
      return <><Circle cx="12" cy="12" r="9" {...strokeProps(color)} fill="none" /><Line x1="8" y1="12" x2="16" y2="12" {...strokeProps(color)} /><Polyline points="12 8 16 12 12 16" {...strokeProps(color)} /></>;
    case "alert-circle":
      return <><Circle cx="12" cy="12" r="9" {...strokeProps(color)} fill="none" /><Line x1="12" y1="7" x2="12" y2="13" {...strokeProps(color)} /><Circle cx="12" cy="17" r=".8" fill={color} /></>;
    case "checkmark":
      return <Polyline points="20 6 9 17 4 12" {...strokeProps(color)} fill="none" />;
    case "checkmark-circle":
    case "checkmark-circle-outline":
      return <><Circle cx="12" cy="12" r="9" {...strokeProps(color)} fill="none" /><Polyline points="8 12 11 15 17 9" {...strokeProps(color)} fill="none" /></>;
    case "chevron-down":
      return <Polyline points="6 9 12 15 18 9" {...strokeProps(color)} fill="none" />;
    case "chevron-forward":
      return <Polyline points="9 6 15 12 9 18" {...strokeProps(color)} fill="none" />;
    case "chevron-up":
      return <Polyline points="6 15 12 9 18 15" {...strokeProps(color)} fill="none" />;
    case "close-circle":
    case "close-circle-outline":
      return <><Circle cx="12" cy="12" r="9" {...strokeProps(color)} fill="none" /><Line x1="9" y1="9" x2="15" y2="15" {...strokeProps(color)} /><Line x1="15" y1="9" x2="9" y2="15" {...strokeProps(color)} /></>;
    case "create":
    case "create-outline":
    case "pencil":
      return <><Path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z" {...strokeProps(color)} fill="none" /><Line x1="13.5" y1="6.5" x2="17.5" y2="10.5" {...strokeProps(color)} /></>;
    case "document-text":
      return <><Path d="M7 3h7l4 4v14H7z" {...strokeProps(color)} fill="none" /><Path d="M14 3v5h5" {...strokeProps(color)} fill="none" /><Line x1="9" y1="13" x2="16" y2="13" {...strokeProps(color)} /><Line x1="9" y1="17" x2="15" y2="17" {...strokeProps(color)} /></>;
    case "download":
    case "download-outline":
      return <><Line x1="12" y1="4" x2="12" y2="15" {...strokeProps(color)} /><Polyline points="7 10 12 15 17 10" {...strokeProps(color)} fill="none" /><Path d="M5 20h14" {...strokeProps(color)} fill="none" /></>;
    case "flash":
      return <Path d="M13 2 4 14h7l-1 8 10-13h-7z" {...strokeProps(color)} fill="none" />;
    case "git-branch":
    case "git-network":
      return <><Circle cx="6" cy="5" r="2" {...strokeProps(color)} fill="none" /><Circle cx="18" cy="6" r="2" {...strokeProps(color)} fill="none" /><Circle cx="6" cy="19" r="2" {...strokeProps(color)} fill="none" /><Path d="M6 7v10M8 7c5 0 4 8 8 8" {...strokeProps(color)} fill="none" /></>;
    case "grid":
      return <><Rect x="4" y="4" width="6" height="6" rx="1" {...strokeProps(color)} fill="none" /><Rect x="14" y="4" width="6" height="6" rx="1" {...strokeProps(color)} fill="none" /><Rect x="4" y="14" width="6" height="6" rx="1" {...strokeProps(color)} fill="none" /><Rect x="14" y="14" width="6" height="6" rx="1" {...strokeProps(color)} fill="none" /></>;
    case "help-circle-outline":
      return <><Circle cx="12" cy="12" r="9" {...strokeProps(color)} fill="none" /><Path d="M9.5 9a2.7 2.7 0 1 1 4.6 1.9c-1.2 1-2.1 1.6-2.1 3.1" {...strokeProps(color)} fill="none" /><Circle cx="12" cy="17" r=".7" fill={color} /></>;
    case "hourglass-outline":
      return <><Path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" {...strokeProps(color)} fill="none" /></>;
    case "information-circle":
    case "information-circle-outline":
      return <><Circle cx="12" cy="12" r="9" {...strokeProps(color)} fill="none" /><Line x1="12" y1="11" x2="12" y2="17" {...strokeProps(color)} /><Circle cx="12" cy="7.5" r=".8" fill={color} /></>;
    case "list":
    case "list-outline":
      return <><Line x1="8" y1="6" x2="20" y2="6" {...strokeProps(color)} /><Line x1="8" y1="12" x2="20" y2="12" {...strokeProps(color)} /><Line x1="8" y1="18" x2="20" y2="18" {...strokeProps(color)} /><Circle cx="4" cy="6" r="1" fill={color} /><Circle cx="4" cy="12" r="1" fill={color} /><Circle cx="4" cy="18" r="1" fill={color} /></>;
    case "lock-closed":
      return <><Rect x="5" y="10" width="14" height="10" rx="2" {...strokeProps(color)} fill="none" /><Path d="M8 10V7a4 4 0 0 1 8 0v3" {...strokeProps(color)} fill="none" /></>;
    case "people":
      return <><Circle cx="9" cy="8" r="3" {...strokeProps(color)} fill="none" /><Path d="M3.5 20c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" {...strokeProps(color)} fill="none" /><Circle cx="17" cy="9" r="2.5" {...strokeProps(color)} fill="none" /><Path d="M15 15c2.4.3 4.2 2 5 5" {...strokeProps(color)} fill="none" /></>;
    case "person-add":
      return <><Circle cx="9" cy="8" r="3" {...strokeProps(color)} fill="none" /><Path d="M3.5 20c.8-3.2 3-5 5.5-5 1.6 0 3 .7 4 2" {...strokeProps(color)} fill="none" /><Line x1="18" y1="9" x2="18" y2="17" {...strokeProps(color)} /><Line x1="14" y1="13" x2="22" y2="13" {...strokeProps(color)} /></>;
    case "play":
      return <Path d="M8 5v14l11-7z" fill={color} />;
    case "refresh":
    case "refresh-circle":
      return <><Path d="M20 12a8 8 0 0 1-13.7 5.7" {...strokeProps(color)} fill="none" /><Path d="M4 12A8 8 0 0 1 17.7 6.3" {...strokeProps(color)} fill="none" /><Polyline points="17 3 18 7 14 8" {...strokeProps(color)} fill="none" /><Polyline points="7 21 6 17 10 16" {...strokeProps(color)} fill="none" /></>;
    case "ribbon-outline":
      return <><Path d="M8 3h8v10a4 4 0 0 1-8 0z" {...strokeProps(color)} fill="none" /><Path d="M9 16l-2 5 5-3 5 3-2-5" {...strokeProps(color)} fill="none" /></>;
    case "share-outline":
      return <><Circle cx="18" cy="5" r="3" {...strokeProps(color)} fill="none" /><Circle cx="6" cy="12" r="3" {...strokeProps(color)} fill="none" /><Circle cx="18" cy="19" r="3" {...strokeProps(color)} fill="none" /><Line x1="8.7" y1="10.7" x2="15.3" y2="6.3" {...strokeProps(color)} /><Line x1="8.7" y1="13.3" x2="15.3" y2="17.7" {...strokeProps(color)} /></>;
    case "shuffle":
      return <><Path d="M4 7h3c4 0 5 10 9 10h4" {...strokeProps(color)} fill="none" /><Path d="M4 17h3c1.5 0 2.5-1.3 3.5-3" {...strokeProps(color)} fill="none" /><Polyline points="17 4 20 7 17 10" {...strokeProps(color)} fill="none" /><Polyline points="17 14 20 17 17 20" {...strokeProps(color)} fill="none" /></>;
    case "stats-chart":
    case "stats-chart-outline":
      return <><Rect x="5" y="11" width="3" height="8" rx="1" fill={color} /><Rect x="11" y="7" width="3" height="12" rx="1" fill={color} /><Rect x="17" y="4" width="3" height="15" rx="1" fill={color} /></>;
    case "time-outline":
      return <><Circle cx="12" cy="12" r="9" {...strokeProps(color)} fill="none" /><Path d="M12 7v5l3 2" {...strokeProps(color)} fill="none" /></>;
    case "trophy":
      return <><Path d="M8 4h8v4a4 4 0 0 1-8 0z" {...strokeProps(color)} fill="none" /><Path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 12v5M8 21h8M10 17h4" {...strokeProps(color)} fill="none" /></>;
    case "x":
      return <><Line x1="6" y1="6" x2="18" y2="18" {...strokeProps(color)} /><Line x1="18" y1="6" x2="6" y2="18" {...strokeProps(color)} /></>;
    default:
      return <Circle cx="12" cy="12" r="8" {...strokeProps(color)} fill="none" />;
  }
}

export function AppIcon({ name, size = 24, color = "black", style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style as never} accessibilityElementsHidden>
      {glyph(name, color)}
    </Svg>
  );
}
