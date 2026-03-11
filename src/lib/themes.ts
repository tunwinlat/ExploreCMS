/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export interface ThemeConfig {
  id: string
  name: string
  fontUrl?: string
  fontFamily?: string
}

export const THEMES: ThemeConfig[] = [
  { id: 'default', name: 'Default (Inter)' },
  { id: 'ocean', name: 'Ocean Depth', fontUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap', fontFamily: "'Outfit', sans-serif" },
  { id: 'sunset', name: 'Desert Sunset', fontUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@400;700&display=swap', fontFamily: "'Lato', sans-serif" },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', fontUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap', fontFamily: "'Space Grotesk', sans-serif" },
  { id: 'forest', name: 'Enchanted Forest', fontUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600&display=swap', fontFamily: "'Open Sans', sans-serif" },
  { id: 'hacker', name: 'Terminal Hacker', fontUrl: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap', fontFamily: "'Fira Code', monospace" },
  { id: 'minimalist', name: 'Pure Minimalist', fontUrl: 'https://fonts.googleapis.com/css2?family=Helvetica+Neue:wght@400;500;700&display=swap', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { id: 'bubblegum', name: 'Bubblegum Pop', fontUrl: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap', fontFamily: "'Quicksand', sans-serif" },
  { id: 'royal', name: 'Royal Velvet', fontUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Cormorant+Garamond:wght@400;600&display=swap', fontFamily: "'Cormorant Garamond', serif" },
  { id: 'midnight', name: 'Midnight City', fontUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&display=swap', fontFamily: "'Montserrat', sans-serif" },
  { id: 'monochromatic', name: 'Monochromatic', fontUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap', fontFamily: "'DM Sans', sans-serif" },
  { id: 'synthwave', name: 'Neon Synthwave', fontUrl: 'https://fonts.googleapis.com/css2?family=Righteous&family=Nunito:wght@400;600;800&display=swap', fontFamily: "'Nunito', sans-serif" },
  { id: 'emerald', name: 'Emerald Isle', fontUrl: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Work+Sans:wght@400;500;700&display=swap', fontFamily: "'Work Sans', sans-serif" },
  { id: 'coffee', name: 'Morning Coffee', fontUrl: 'https://fonts.googleapis.com/css2?family=Bitter:wght@400;600&family=Source+Sans+Pro:wght@400;600&display=swap', fontFamily: "'Source Sans Pro', sans-serif" },
  { id: 'glacier', name: 'Arctic Glacier', fontUrl: 'https://fonts.googleapis.com/css2?family=Jost:wght@400;500;700&display=swap', fontFamily: "'Jost', sans-serif" },
  { id: 'lavender', name: 'Lavender Dream', fontUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap', fontFamily: "'Poppins', sans-serif" },
  { id: 'volcanic', name: 'Volcanic Ash', fontUrl: 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Roboto+Condensed:wght@400;700&display=swap', fontFamily: "'Roboto Condensed', sans-serif" },
  { id: 'sakura', name: 'Tokyo Sakura', fontUrl: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;800&family=Noto+Sans+JP:wght@400;500;700&display=swap', fontFamily: "'Noto Sans JP', sans-serif" },
  { id: 'dracula', name: 'Dracula', fontUrl: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap', fontFamily: "'Ubuntu', sans-serif" },
  { id: 'solarized', name: 'Solarized', fontUrl: 'https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;600;800&display=swap', fontFamily: "'Inconsolata', monospace" },
  { id: 'gruvbox', name: 'Gruvbox', fontUrl: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;700&display=swap', fontFamily: "'Fira Sans', sans-serif" }
]

export function getThemeConfig(themeId: string): ThemeConfig {
  return THEMES.find(t => t.id === themeId) || THEMES[0]
}
