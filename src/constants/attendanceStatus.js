import { colors } from '../theme';

export const STATUS = {
  A:  { label: 'Not Checked In', color: colors.textSecondary, bg: colors.bg,      dot: '#D1D5DB' },
  NC: { label: 'Checked In',     color: colors.green,          bg: colors.greenBg, dot: colors.green },
  P:  { label: 'Present',        color: colors.green,          bg: colors.greenBg, dot: colors.green },
  H:  { label: 'Half Day',       color: colors.amber,          bg: colors.amberBg, dot: colors.amber },
  L:  { label: 'On Leave',       color: colors.purple,         bg: colors.purpleBg,dot: colors.purple },
  R:  { label: 'Rest Day',       color: colors.blue,           bg: colors.blueBg,  dot: colors.blue },
};
