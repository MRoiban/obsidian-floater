export interface ColorEntry {
  name: string;
  value: string;
  category?: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: ColorEntry[];
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "default-palette",
    name: "Default Colors",
    colors: [
      { name: "Red", value: "var(--mk-color-red)", category: "brand" },
      { name: "Pink", value: "var(--mk-color-pink)", category: "brand" },
      { name: "Orange", value: "var(--mk-color-orange)", category: "brand" },
      { name: "Yellow", value: "var(--mk-color-yellow)", category: "brand" },
      { name: "Green", value: "var(--mk-color-green)", category: "brand" },
      { name: "Turquoise", value: "var(--mk-color-turquoise)", category: "brand" },
      { name: "Teal", value: "var(--mk-color-teal)", category: "brand" },
      { name: "Blue", value: "var(--mk-color-blue)", category: "brand" },
      { name: "Purple", value: "var(--mk-color-purple)", category: "brand" },
      { name: "Brown", value: "var(--mk-color-brown)", category: "brand" },
      { name: "Charcoal", value: "var(--mk-color-charcoal)", category: "brand" },
      { name: "Gray", value: "var(--mk-color-gray)", category: "brand" }
    ]
  },
  {
    id: "monochrome-palette",
    name: "Monochrome Colors",
    colors: [
      { name: "Base 0", value: "var(--mk-color-base-0)", category: "base" },
      { name: "Base 10", value: "var(--mk-color-base-10)", category: "base" },
      { name: "Base 20", value: "var(--mk-color-base-20)", category: "base" },
      { name: "Base 30", value: "var(--mk-color-base-30)", category: "base" },
      { name: "Base 40", value: "var(--mk-color-base-40)", category: "base" },
      { name: "Base 50", value: "var(--mk-color-base-50)", category: "base" },
      { name: "Base 60", value: "var(--mk-color-base-60)", category: "base" },
      { name: "Base 70", value: "var(--mk-color-base-70)", category: "base" },
      { name: "Base 100", value: "var(--mk-color-base-100)", category: "base" }
    ]
  },
  {
    id: "default-gradient-palette",
    name: "Gradients",
    colors: [
      { name: "Warm Sunset", value: "linear-gradient(135deg, #ffff84 0%, #ff6164 50%, #b00012 100%)", category: "custom" },
      { name: "Earth Tones", value: "linear-gradient(90deg, #a47451 0%, #9c9881 17%, #73a09d 33%, #3b899a 50%, #095b79 67%, #002847 83%, #000116 100%)", category: "custom" },
      { name: "Golden Pink", value: "linear-gradient(45deg, #fada61 0%, #ff9188 50%, #ff5acd 100%)", category: "custom" },
      { name: "Soft Pink", value: "linear-gradient(45deg, #fc8ec5 0%, #ff8dd3 25%, #ffa1d8 50%, #ffc1d2 75%, #ffe0c3 100%)", category: "custom" },
      { name: "Purple Gold", value: "linear-gradient(45deg, #4159d0 0%, #c84fc0 50%, #ffcd70 100%)", category: "custom" },
      { name: "Cyan Purple", value: "linear-gradient(45deg, #23d4fd 0%, #3a98f0 50%, #b721ff 100%)", category: "custom" }
    ]
  },
  {
    id: "pastel-palette",
    name: "Pastel Colors",
    colors: [
      { name: "Light Pink", value: "#FFB6C1", category: "custom" },
      { name: "Gold", value: "#FFD700", category: "custom" },
      { name: "Pale Green", value: "#98FB98", category: "custom" },
      { name: "Sky Blue", value: "#87CEEB", category: "custom" },
      { name: "Plum", value: "#DDA0DD", category: "custom" },
      { name: "Khaki", value: "#F0E68C", category: "custom" },
      { name: "Light Salmon", value: "#FFA07A", category: "custom" },
      { name: "Powder Blue", value: "#B0E0E6", category: "custom" },
      { name: "Moccasin", value: "#FFE4B5", category: "custom" },
      { name: "Lavender", value: "#E6E6FA", category: "custom" }
    ]
  }
];

export const selectedPaletteColors = (paletteId: string): [string, string][] => {
  const palette = COLOR_PALETTES.find((item) => item.id === paletteId) ?? COLOR_PALETTES[0];
  return palette.colors.map((color) => [color.name, color.value]);
};
