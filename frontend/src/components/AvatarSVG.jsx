import owlyImg from '../assets/avatars/owly.png'
import roboImg from '../assets/avatars/robo.png'
import foxImg  from '../assets/avatars/fox.png'
import cosmoImg from '../assets/avatars/cosmo.png'

const IMGS = {
  owly:  owlyImg,
  robo:  roboImg,
  fox:   foxImg,
  cosmo: cosmoImg,
}

// CSS filter chains that convert the dark navy image pixels to each target color.
// brightness(0) normalizes to black first, then the invert/sepia/hue-rotate chain
// colorizes to match the target hex.
export const COLOR_FILTERS = {
  indigo: 'brightness(0) saturate(100%) invert(42%) sepia(69%) saturate(1272%) hue-rotate(218deg) brightness(101%)',
  teal:   'brightness(0) saturate(100%) invert(56%) sepia(75%) saturate(435%) hue-rotate(131deg) brightness(98%)',
  pink:   'brightness(0) saturate(100%) invert(40%) sepia(98%) saturate(1069%) hue-rotate(300deg) brightness(98%)',
  orange: 'brightness(0) saturate(100%) invert(63%) sepia(95%) saturate(1018%) hue-rotate(351deg) brightness(104%)',
  red:    'brightness(0) saturate(100%) invert(44%) sepia(77%) saturate(1296%) hue-rotate(326deg) brightness(103%)',
}

export default function AvatarSVG({ character = 'owly', color = 'indigo', size = 80 }) {
  return (
    <img
      src={IMGS[character] ?? IMGS.owly}
      width={size}
      height={size}
      alt={character}
      style={{
        display: 'block',
        objectFit: 'contain',
        filter: COLOR_FILTERS[color] ?? COLOR_FILTERS.indigo,
      }}
    />
  )
}
