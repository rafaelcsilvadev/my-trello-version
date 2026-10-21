/* @ds-bundle: {"format":4,"namespace":"PRpuraDesignSystem_ea4aaf","components":[{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Divider","sourcePath":"components/display/Divider.jsx"},{"name":"Icon","sourcePath":"components/display/Icon.jsx"},{"name":"PriorityTag","sourcePath":"components/display/PriorityTag.jsx"},{"name":"StatGroup","sourcePath":"components/display/StatGroup.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"SegmentedControl","sourcePath":"components/navigation/SegmentedControl.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"ColumnHeader","sourcePath":"components/tasks/ColumnHeader.jsx"},{"name":"TaskCard","sourcePath":"components/tasks/TaskCard.jsx"}],"sourceHashes":{"components/display/Avatar.jsx":"50979bd825fb","components/display/Badge.jsx":"a7d9f556d19d","components/display/Card.jsx":"6fff9ce83e78","components/display/Divider.jsx":"64a31401557f","components/display/Icon.jsx":"c172e59d6a55","components/display/PriorityTag.jsx":"7f7e430cc3d7","components/display/StatGroup.jsx":"5b66bcbb7ee8","components/feedback/Dialog.jsx":"5e5b2433d764","components/feedback/Toast.jsx":"2bbd7f4aa865","components/feedback/Tooltip.jsx":"5d38574df21b","components/forms/Button.jsx":"c2619f32c84e","components/forms/Checkbox.jsx":"2108368ac582","components/forms/IconButton.jsx":"7a464594cd6d","components/forms/Input.jsx":"6c460fd492fd","components/forms/Select.jsx":"556350e01ed2","components/forms/Switch.jsx":"95007d7a3c0e","components/navigation/SegmentedControl.jsx":"10107ef9cf52","components/navigation/Tabs.jsx":"64050000c574","components/tasks/ColumnHeader.jsx":"579276924dbc","components/tasks/TaskCard.jsx":"179d08239141","ui_kits/auth/AuthLayout.jsx":"bae8c9748b8e","ui_kits/auth/LoginScreen.jsx":"08f64f5713eb","ui_kits/auth/SignupScreen.jsx":"51879d2558ec","ui_kits/tasks/Board.jsx":"ba8cabbd3a9e","ui_kits/tasks/Sidebar.jsx":"f241fe683b02","ui_kits/tasks/TaskDialog.jsx":"678c3507b36e","ui_kits/tasks/Topbar.jsx":"26c557539057","ui_kits/tasks/data.js":"c7165e02336d"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PRpuraDesignSystem_ea4aaf = window.PRpuraDesignSystem_ea4aaf || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Avatar.jsx
try { (() => {
const PALETTE = ['var(--purple-500)', 'var(--blue-500)', 'var(--green-500)', 'var(--amber-500)', 'var(--red-500)', 'var(--purple-800)'];
const initials = (n = '') => n.trim().split(/\s+/).slice(0, 1).map(s => s[0]).join('').toUpperCase();
const hash = (s = '') => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
function Avatar({
  name = '',
  src,
  size = 20,
  color,
  extra,
  ring = false,
  style
}) {
  const bg = color || PALETTE[hash(name) % PALETTE.length];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    title: name,
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      flex: 'none',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: src ? 'var(--neutral-200)' : bg,
      color: '#fff',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: Math.round(size * 0.48),
      lineHeight: 1,
      boxShadow: ring ? '0 0 0 2px #fff, 0 0 0 3.5px var(--purple-300)' : 'none'
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials(name)), extra ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--neutral-700)',
      background: 'var(--neutral-100)',
      borderRadius: 4,
      padding: '2px 5px'
    }
  }, "+", extra) : null);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function Card({
  padding = 14,
  interactive = false,
  selected = false,
  children,
  style,
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-lg)',
      padding,
      border: '1px solid ' + (selected ? 'var(--purple-300)' : h && interactive ? 'var(--border-default)' : 'var(--border-subtle)'),
      boxShadow: selected ? 'var(--focus-ring)' : h && interactive ? 'var(--shadow-md)' : 'var(--shadow-xs)',
      cursor: interactive ? 'pointer' : 'default',
      transition: 'box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Divider.jsx
try { (() => {
function Divider({
  label,
  vertical = false,
  style
}) {
  if (vertical) return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      alignSelf: 'stretch',
      background: 'var(--border-subtle)',
      ...style
    }
  });
  const line = /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      ...style
    }
  }, line, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, label), label && line);
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Divider.jsx", error: String((e && e.message) || e) }); }

// components/display/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const BASE = 'https://unpkg.com/lucide-static@0.454.0/icons/';
function Icon({
  name,
  size = 16,
  color = 'currentColor',
  style,
  ...rest
}) {
  const url = 'url(' + BASE + name + '.svg) center / contain no-repeat';
  return /*#__PURE__*/React.createElement("span", _extends({
    "aria-hidden": "true"
  }, rest, {
    style: {
      display: 'inline-block',
      flex: 'none',
      width: size,
      height: size,
      backgroundColor: color,
      WebkitMask: url,
      mask: url,
      ...style
    }
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Icon.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
const TONES = {
  neutral: ['var(--neutral-100)', 'var(--neutral-700)', 'var(--neutral-600)'],
  brand: ['var(--purple-50)', 'var(--purple-700)', 'var(--purple-700)'],
  success: ['var(--green-50)', 'var(--green-700)', 'var(--green-500)'],
  warning: ['var(--amber-50)', 'var(--amber-700)', 'var(--amber-500)'],
  danger: ['var(--red-50)', 'var(--red-700)', 'var(--red-500)'],
  info: ['var(--blue-50)', 'var(--blue-700)', 'var(--blue-500)']
};
const SOLID = {
  neutral: 'var(--neutral-700)',
  brand: 'var(--brand)',
  success: 'var(--green-500)',
  warning: 'var(--amber-500)',
  danger: 'var(--red-500)',
  info: 'var(--blue-500)'
};
function Badge({
  tone = 'neutral',
  variant = 'soft',
  icon,
  size = 'md',
  children,
  style
}) {
  const [bg, fg, ic] = TONES[tone] || TONES.neutral;
  const solid = variant === 'solid';
  const outline = variant === 'outline';
  const sm = size === 'sm';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      height: sm ? 20 : 24,
      padding: sm ? '0 6px' : '0 8px',
      borderRadius: 'var(--radius-xs)',
      fontFamily: 'var(--font-body)',
      fontSize: sm ? 11 : 12,
      fontWeight: 500,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      background: solid ? SOLID[tone] : outline ? 'var(--surface-card)' : bg,
      color: solid ? '#fff' : fg,
      border: outline ? '1px solid var(--border-subtle)' : '1px solid transparent',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: sm ? 11 : 12,
    color: solid ? '#fff' : ic
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/PriorityTag.jsx
try { (() => {
const LEVELS = {
  low: {
    label: 'Baixa',
    color: 'var(--priority-low)'
  },
  medium: {
    label: 'Média',
    color: 'var(--priority-medium)'
  },
  high: {
    label: 'Alta',
    color: 'var(--priority-high)'
  }
};
function PriorityTag({
  level = 'medium',
  label,
  style
}) {
  const l = LEVELS[level] || LEVELS.medium;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      height: 22,
      padding: '0 7px 0 6px',
      borderRadius: 'var(--radius-xs)',
      background: 'var(--neutral-50)',
      border: '1px solid var(--neutral-100)',
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "flag",
    size: 12,
    color: l.color,
    style: {
      transform: 'translateY(-0.5px)'
    }
  }), label || l.label);
}
Object.assign(__ds_scope, { PriorityTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/PriorityTag.jsx", error: String((e && e.message) || e) }); }

// components/display/StatGroup.jsx
try { (() => {
function StatGroup({
  items = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 0',
      ...style
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      minWidth: 0,
      padding: '0 16px',
      borderLeft: i ? '1px solid var(--border-subtle)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap'
    }
  }, it.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: it.icon,
    size: 14,
    color: it.iconColor || 'var(--text-secondary)'
  }), it.label), /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-stat)',
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em'
    }
  }, it.value))));
}
Object.assign(__ds_scope, { StatGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatGroup.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function Dialog({
  open = true,
  title,
  description,
  children,
  footer,
  onClose,
  width = 480,
  inline = false
}) {
  if (!open) return null;
  const panel = /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      width,
      maxWidth: '100%',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-body)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '18px 20px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '600 20px/1.2 var(--font-display)',
      letterSpacing: '-0.01em',
      color: 'var(--text-primary)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: 'var(--text-secondary)',
      marginTop: 6
    }
  }, description)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Fechar",
    style: {
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-tertiary)',
      padding: 4,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      padding: '12px 20px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--neutral-25)'
    }
  }, footer));
  if (inline) return panel;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'var(--surface-overlay)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }
  }, panel);
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const T = {
  success: ['circle-check', 'var(--green-500)'],
  danger: ['circle-alert', 'var(--red-500)'],
  info: ['info', 'var(--blue-500)'],
  brand: ['sparkles', 'var(--purple-600)']
};
function Toast({
  tone = 'success',
  title,
  description,
  onClose,
  style
}) {
  const [icon, color] = T[tone] || T.success;
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      width: 360,
      padding: '14px 14px 14px 16px',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: color,
    style: {
      marginTop: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, description)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Fechar",
    style: {
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-tertiary)',
      padding: 0,
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 16
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  placement = 'top',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const pos = placement === 'right' ? {
    left: '100%',
    top: '50%',
    transform: 'translate(8px,-50%)'
  } : placement === 'bottom' ? {
    top: '100%',
    left: '50%',
    transform: 'translate(-50%,8px)'
  } : {
    bottom: '100%',
    left: '50%',
    transform: 'translate(-50%,-8px)'
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false)
  }, children, open && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      ...pos,
      zIndex: 50,
      whiteSpace: 'nowrap',
      padding: '5px 8px',
      borderRadius: 6,
      background: 'var(--surface-inverse)',
      color: '#fff',
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      fontWeight: 500,
      boxShadow: 'var(--shadow-md)',
      pointerEvents: 'none'
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 30,
    padding: '0 10px',
    fontSize: 13,
    gap: 6,
    icon: 14
  },
  md: {
    height: 36,
    padding: '0 14px',
    fontSize: 14,
    gap: 8,
    icon: 16
  },
  lg: {
    height: 46,
    padding: '0 20px',
    fontSize: 16,
    gap: 10,
    icon: 18
  }
};
const VARIANTS = {
  primary: {
    bg: 'var(--brand)',
    hover: 'var(--brand-hover)',
    press: 'var(--brand-press)',
    fg: 'var(--on-brand)',
    border: 'transparent'
  },
  secondary: {
    bg: 'var(--surface-card)',
    hover: 'var(--neutral-50)',
    press: 'var(--neutral-100)',
    fg: 'var(--text-primary)',
    border: 'var(--border-subtle)',
    shadow: 'var(--shadow-xs)'
  },
  soft: {
    bg: 'var(--purple-50)',
    hover: 'var(--purple-100)',
    press: 'var(--purple-200)',
    fg: 'var(--purple-700)',
    border: 'transparent'
  },
  ghost: {
    bg: 'transparent',
    hover: 'var(--neutral-100)',
    press: 'var(--neutral-200)',
    fg: 'var(--text-primary)',
    border: 'transparent'
  },
  danger: {
    bg: 'var(--red-500)',
    hover: 'var(--red-600)',
    press: 'var(--red-700)',
    fg: '#fff',
    border: 'transparent'
  },
  upgrade: {
    bg: 'var(--gold-400)',
    hover: 'var(--gold-500)',
    press: 'var(--gold-500)',
    fg: 'var(--gold-900)',
    border: 'var(--gold-500)'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  type = 'button',
  children,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const bg = disabled ? v.bg : press ? v.press : hover ? v.hover : v.bg;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick
  }, rest, {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: s.padding,
      width: fullWidth ? '100%' : undefined,
      fontFamily: 'var(--font-body)',
      fontSize: s.fontSize,
      fontWeight: 500,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      color: v.fg,
      background: bg,
      border: '1px solid ' + v.border,
      borderRadius: 'var(--radius-sm)',
      boxShadow: v.shadow || 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transform: press && !disabled ? 'translateY(0.5px)' : 'none',
      transition: 'background var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }), iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: s.icon
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--text-primary)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      position: 'absolute',
      opacity: 0,
      width: 0,
      height: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 20,
      height: 20,
      flex: 'none',
      borderRadius: 5,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: checked ? 'var(--purple-50)' : 'var(--surface-card)',
      border: '1px solid ' + (checked ? 'var(--purple-200)' : 'var(--border-default)'),
      transition: 'background var(--dur-fast) var(--ease-standard)'
    }
  }, checked && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    color: "var(--purple-600)"
  })), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
const SIZES = {
  sm: [28, 14],
  md: [34, 16],
  lg: [40, 18]
};
function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  active = false,
  dot = false,
  onClick,
  style
}) {
  const [h, setH] = React.useState(false);
  const [box, ic] = SIZES[size] || SIZES.md;
  const look = {
    ghost: {
      bg: active ? 'var(--purple-50)' : h ? 'var(--neutral-100)' : 'transparent',
      fg: active ? 'var(--purple-700)' : 'var(--text-secondary)',
      border: 'transparent'
    },
    outline: {
      bg: h ? 'var(--neutral-50)' : 'var(--surface-card)',
      fg: 'var(--text-primary)',
      border: 'var(--border-subtle)'
    },
    primary: {
      bg: h ? 'var(--brand-hover)' : 'var(--brand)',
      fg: '#fff',
      border: 'transparent'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", {
    "aria-label": label,
    title: label,
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      position: 'relative',
      width: box,
      height: box,
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: look.bg,
      color: look.fg,
      border: '1px solid ' + look.border,
      borderRadius: variant === 'primary' && size === 'lg' ? '50%' : 'var(--radius-md)',
      cursor: 'pointer',
      padding: 0,
      transition: 'background var(--dur-fast) var(--ease-standard)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: ic
  }), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 6,
      right: 7,
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--red-500)',
      boxShadow: '0 0 0 1.5px #fff'
    }
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  iconLeft,
  size = 'lg',
  variant = 'default',
  type = 'text',
  value,
  defaultValue,
  placeholder,
  onChange,
  disabled = false,
  id,
  style,
  inputStyle,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const [show, setShow] = React.useState(false);
  const h = {
    sm: 32,
    md: 36,
    lg: 46
  }[size] || 46;
  const filled = variant === 'filled';
  const isPw = type === 'password';
  const border = error ? 'var(--red-500)' : focus ? 'var(--border-focus)' : filled ? 'transparent' : 'var(--border-subtle)';
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: id,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)',
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: h,
      padding: '0 ' + (size === 'lg' ? 14 : 10) + 'px',
      background: disabled ? 'var(--neutral-50)' : filled ? 'var(--neutral-100)' : 'var(--surface-card)',
      border: '1px solid ' + border,
      borderRadius: 'var(--radius-sm)',
      boxShadow: focus ? error ? 'var(--focus-ring-danger)' : 'var(--focus-ring)' : filled ? 'none' : 'var(--shadow-input)',
      transition: 'box-shadow var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)'
    }
  }, iconLeft && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconLeft,
    size: 16,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: isPw && show ? 'text' : type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false)
  }, rest, {
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: 'transparent',
      font: 'inherit',
      fontSize: size === 'lg' ? 15 : 14,
      color: 'var(--text-primary)',
      ...inputStyle
    }
  })), isPw && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShow(s => !s),
    "aria-label": show ? 'Ocultar senha' : 'Mostrar senha',
    style: {
      border: 0,
      background: 'transparent',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--text-tertiary)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: show ? 'eye-off' : 'eye',
    size: 16
  }))), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: error ? 'var(--red-600)' : 'var(--text-tertiary)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder,
  size = 'md',
  style
}) {
  const [h, setH] = React.useState(false);
  const height = {
    sm: 30,
    md: 36,
    lg: 46
  }[size] || 36;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      gap: 8,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-label)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'flex'
    },
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false)
  }, /*#__PURE__*/React.createElement("select", {
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height,
      padding: '0 34px 0 12px',
      font: 'inherit',
      fontSize: 14,
      fontWeight: 500,
      color: value ? 'var(--text-primary)' : 'var(--text-secondary)',
      background: h ? 'var(--neutral-50)' : 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-xs)',
      cursor: 'pointer',
      outline: 'none'
    }
  }, placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => typeof o === 'string' ? /*#__PURE__*/React.createElement("option", {
    key: o,
    value: o
  }, o) : /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    color: "var(--text-secondary)",
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      marginTop: -7,
      pointerEvents: 'none'
    }
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function Switch({
  checked = false,
  onChange,
  label,
  disabled = false,
  style
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "switch",
    "aria-checked": checked,
    disabled: disabled,
    onClick: () => onChange && onChange(!checked),
    style: {
      width: 34,
      height: 20,
      padding: 2,
      border: 0,
      borderRadius: 999,
      background: checked ? 'var(--brand)' : 'var(--neutral-300)',
      cursor: 'inherit',
      display: 'flex',
      transition: 'background var(--dur-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transform: checked ? 'translateX(14px)' : 'none',
      transition: 'transform var(--dur-base) var(--ease-emphasized)'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SegmentedControl.jsx
try { (() => {
function SegmentedControl({
  options = [],
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'inline-flex',
      gap: 2,
      padding: 2,
      background: 'var(--neutral-100)',
      borderRadius: 'var(--radius-md)',
      ...style
    }
  }, options.map(o => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      role: "tab",
      "aria-selected": on,
      title: o.title || o.label,
      onClick: () => onChange && onChange(o.value),
      style: {
        height: 30,
        minWidth: 32,
        padding: o.label ? '0 10px' : 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        border: 0,
        borderRadius: 6,
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 500,
        background: on ? 'var(--surface-card)' : 'transparent',
        color: on ? 'var(--text-primary)' : 'var(--text-tertiary)',
        boxShadow: on ? 'var(--shadow-sm)' : 'none',
        transition: 'background var(--dur-fast) var(--ease-standard)'
      }
    }, o.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: o.icon,
      size: 16
    }), o.label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: 20,
      borderBottom: '1px solid var(--border-subtle)',
      ...style
    }
  }, items.map(it => {
    const on = it.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.value,
      role: "tab",
      "aria-selected": on,
      onClick: () => onChange && onChange(it.value),
      style: {
        position: 'relative',
        padding: '10px 0',
        border: 0,
        background: 'transparent',
        cursor: 'pointer',
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        fontWeight: 500,
        color: on ? 'var(--purple-700)' : 'var(--text-secondary)',
        boxShadow: on ? 'inset 0 -2px 0 var(--purple-700)' : 'none',
        marginBottom: -1
      }
    }, it.label, it.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        background: on ? 'var(--purple-50)' : 'var(--neutral-100)',
        color: on ? 'var(--purple-700)' : 'var(--text-secondary)'
      }
    }, it.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/tasks/ColumnHeader.jsx
try { (() => {
const S = {
  todo: {
    label: 'A fazer',
    icon: 'circle-dashed',
    bg: 'var(--status-todo-bg)',
    fg: 'var(--status-todo-fg)',
    bar: 'var(--neutral-500)'
  },
  overdue: {
    label: 'Atrasado',
    icon: 'triangle-alert',
    bg: 'var(--status-overdue-bg)',
    fg: 'var(--status-overdue-fg)',
    bar: 'var(--red-500)'
  },
  doing: {
    label: 'Em andamento',
    icon: 'circle-play',
    bg: 'var(--status-doing-bg)',
    fg: 'var(--status-doing-fg)',
    bar: 'var(--blue-500)'
  },
  done: {
    label: 'Concluído',
    icon: 'circle-check',
    bg: 'var(--status-done-bg)',
    fg: 'var(--status-done-fg)',
    bar: 'var(--green-500)'
  }
};
function ColumnHeader({
  status = 'todo',
  label,
  count = 0,
  style
}) {
  const s = S[status] || S.todo;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      height: 32,
      padding: '0 6px 0 10px',
      borderRadius: 6,
      background: s.bg,
      boxShadow: 'inset 2px 0 0 ' + s.bar,
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: s.icon,
    size: 14,
    color: s.bar
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)'
    }
  }, label || s.label), /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 22,
      height: 20,
      padding: '0 6px',
      borderRadius: 4,
      background: '#fff',
      fontSize: 12,
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, count));
}
Object.assign(__ds_scope, { ColumnHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/tasks/ColumnHeader.jsx", error: String((e && e.message) || e) }); }

// components/tasks/TaskCard.jsx
try { (() => {
function Row({
  icon,
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 100,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 14,
    color: "var(--text-tertiary)"
  }), label), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      fontSize: 13,
      color: 'var(--text-primary)',
      fontWeight: 500
    }
  }, children));
}
function TaskCard({
  title,
  priority = 'medium',
  assignee,
  extraAssignees,
  dueDate,
  subtasks,
  comments,
  onClick,
  onMenu,
  selected,
  style
}) {
  const footer = subtasks || comments;
  return /*#__PURE__*/React.createElement(__ds_scope.Card, {
    interactive: true,
    selected: selected,
    onClick: onClick,
    padding: 0,
    style: {
      fontFamily: 'var(--font-body)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 12px 8px 14px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      fontWeight: 500,
      color: 'var(--text-primary)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    "aria-label": "Mais op\xE7\xF5es",
    onClick: e => {
      e.stopPropagation();
      onMenu && onMenu();
    },
    style: {
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      padding: 2,
      color: 'var(--text-primary)',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "ellipsis",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '0 14px 12px'
    }
  }, /*#__PURE__*/React.createElement(Row, {
    icon: "flag",
    label: "Prioridade"
  }, /*#__PURE__*/React.createElement(__ds_scope.PriorityTag, {
    level: priority
  })), /*#__PURE__*/React.createElement(Row, {
    icon: "contact-round",
    label: "Respons\xE1vel"
  }, assignee && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: assignee.name,
    src: assignee.src,
    color: assignee.color,
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, assignee.name), extraAssignees ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      fontSize: 11,
      fontWeight: 500,
      color: 'var(--neutral-700)',
      background: 'var(--neutral-100)',
      borderRadius: 4,
      padding: '2px 5px'
    }
  }, "+", extraAssignees) : null)), /*#__PURE__*/React.createElement(Row, {
    icon: "calendar",
    label: "Prazo"
  }, dueDate)), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      margin: '0 14px',
      padding: '10px 0 12px',
      borderTop: '1px solid var(--border-subtle)',
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, subtasks ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "corner-down-right",
    size: 14,
    color: "var(--text-tertiary)"
  }), subtasks, " subtarefas") : null, subtasks && comments ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 3,
      height: 3,
      borderRadius: '50%',
      background: 'var(--neutral-400)'
    }
  }) : null, comments ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "message-square-more",
    size: 14,
    color: "var(--text-tertiary)"
  }), comments, " coment\xE1rios") : null));
}
Object.assign(__ds_scope, { TaskCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/tasks/TaskCard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/auth/AuthLayout.jsx
try { (() => {
function AuthLayout({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--gradient-auth)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      padding: '28px 64px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 34px/1 var(--font-display)',
      letterSpacing: '-0.03em',
      color: 'var(--purple-700)'
    }
  }, "p\xFArpura")), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      padding: '8px 24px 48px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 'var(--form-width)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, children)));
}
function AuthTitle({
  children,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--type-h1)',
      fontSize: 40,
      letterSpacing: 'var(--tracking-tight)',
      color: 'var(--text-primary)'
    }
  }, children), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      font: 'var(--type-body)',
      color: 'var(--text-secondary)'
    }
  }, sub));
}
function SocialRow() {
  const {
    Button
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    iconLeft: "chrome",
    style: {
      fontSize: 14,
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-input)'
    }
  }, "Entrar com Google"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg",
    iconLeft: "users",
    style: {
      fontSize: 14,
      border: '1px solid transparent',
      boxShadow: 'var(--shadow-input)'
    }
  }, "Entrar com Teams"));
}
Object.assign(window, {
  AuthLayout,
  AuthTitle,
  SocialRow
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth/AuthLayout.jsx", error: String((e && e.message) || e) }); }

// ui_kits/auth/LoginScreen.jsx
try { (() => {
function LoginScreen({
  onSubmit,
  onGoSignup
}) {
  const {
    Input,
    Checkbox,
    Button,
    Divider
  } = window.DS;
  const [email, setEmail] = React.useState('joao.silva@gmail.com');
  const [pw, setPw] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  const [err, setErr] = React.useState(null);
  const submit = e => {
    e.preventDefault();
    if (pw.length < 6) {
      setErr('Senha incorreta. Tente novamente.');
      return;
    }
    onSubmit({
      email
    });
  };
  return /*#__PURE__*/React.createElement(AuthLayout, null, /*#__PURE__*/React.createElement(AuthTitle, {
    sub: "Bom te ver de novo. Entre para continuar."
  }, "Entrar"), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "E-mail",
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value)
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Senha",
    type: "password",
    placeholder: "Sua senha",
    value: pw,
    onChange: e => {
      setPw(e.target.value);
      setErr(null);
    },
    error: err,
    hint: !err ? 'Dica: qualquer senha com 6+ caracteres' : null
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: remember,
    onChange: setRemember,
    label: "Lembrar de mim"
  }), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      textDecoration: 'none'
    }
  }, "Esqueci a senha")), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    size: "lg",
    fullWidth: true,
    style: {
      marginTop: 18,
      fontSize: 18,
      height: 52
    }
  }, "Entrar"), /*#__PURE__*/React.createElement(Divider, {
    label: "ou",
    style: {
      margin: '4px 12px'
    }
  }), /*#__PURE__*/React.createElement(SocialRow, null), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      margin: '64px 0 0',
      fontSize: 17
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      textDecoration: 'underline',
      textUnderlineOffset: 3
    }
  }, "Ainda n\xE3o tem conta?"), ' ', /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onGoSignup();
    },
    style: {
      color: 'var(--purple-600)',
      fontWeight: 500,
      textDecoration: 'none'
    }
  }, "Cadastre-se"))));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/auth/SignupScreen.jsx
try { (() => {
function SignupScreen({
  onSubmit,
  onGoLogin
}) {
  const {
    Input,
    Checkbox,
    Button,
    Divider
  } = window.DS;
  const [f, setF] = React.useState({
    first: 'João',
    last: 'Silva',
    email: 'joao.silva@gmail.com',
    pw: 'senhaforte1',
    pw2: 'senhaforte1'
  });
  const [agree, setAgree] = React.useState(true);
  const [tried, setTried] = React.useState(false);
  const set = k => e => setF({
    ...f,
    [k]: e.target.value
  });
  const mismatch = tried && f.pw !== f.pw2 ? 'As senhas não coincidem' : null;
  const submit = e => {
    e.preventDefault();
    setTried(true);
    if (f.pw === f.pw2 && agree) onSubmit(f);
  };
  return /*#__PURE__*/React.createElement(AuthLayout, null, /*#__PURE__*/React.createElement(AuthTitle, null, "Crie sua conta"), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 34
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Nome",
    value: f.first,
    onChange: set('first')
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Sobrenome",
    value: f.last,
    onChange: set('last')
  })), /*#__PURE__*/React.createElement(Input, {
    label: "E-mail",
    type: "email",
    value: f.email,
    onChange: set('email')
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Senha",
    type: "password",
    value: f.pw,
    onChange: set('pw')
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Confirmar senha",
    type: "password",
    value: f.pw2,
    onChange: set('pw2'),
    error: mismatch
  }), /*#__PURE__*/React.createElement(Checkbox, {
    checked: agree,
    onChange: setAgree,
    label: "Concordo com os Termos e Condi\xE7\xF5es",
    style: {
      marginTop: 4
    }
  }), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    size: "lg",
    fullWidth: true,
    disabled: !agree,
    style: {
      marginTop: 18,
      fontSize: 18,
      height: 52
    }
  }, "Cadastrar"), /*#__PURE__*/React.createElement(Divider, {
    label: "ou",
    style: {
      margin: '4px 12px'
    }
  }), /*#__PURE__*/React.createElement(SocialRow, null), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      margin: '64px 0 0',
      fontSize: 17,
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      textDecoration: 'underline',
      textUnderlineOffset: 3
    }
  }, "J\xE1 tem uma conta?"), ' ', /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onGoLogin();
    },
    style: {
      color: 'var(--purple-600)',
      fontWeight: 500,
      textDecoration: 'none'
    }
  }, "Entrar"))));
}
window.SignupScreen = SignupScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth/SignupScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tasks/Board.jsx
try { (() => {
const COLS = ['todo', 'overdue', 'doing', 'done'];
function Toolbar({
  view,
  setView,
  query,
  setQuery,
  priority,
  setPriority,
  assignee,
  setAssignee,
  assignees,
  onCreate
}) {
  const {
    Input,
    SegmentedControl,
    Select,
    Button
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Input, {
    size: "md",
    iconLeft: "search",
    placeholder: "Buscar\u2026",
    value: query,
    onChange: e => setQuery(e.target.value),
    style: {
      width: 190
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 22,
      background: 'var(--border-subtle)'
    }
  }), /*#__PURE__*/React.createElement(SegmentedControl, {
    value: view,
    onChange: setView,
    options: [{
      value: 'list',
      icon: 'table',
      title: 'Lista'
    }, {
      value: 'board',
      icon: 'square-kanban',
      title: 'Quadro'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "Respons\xE1vel",
    value: assignee,
    onChange: setAssignee,
    options: assignees
  }), /*#__PURE__*/React.createElement(Select, {
    placeholder: "Prioridade",
    value: priority,
    onChange: setPriority,
    options: [{
      value: 'low',
      label: 'Baixa'
    }, {
      value: 'medium',
      label: 'Média'
    }, {
      value: 'high',
      label: 'Alta'
    }]
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconLeft: "list-filter",
    onClick: () => {
      setPriority('');
      setAssignee('');
      setQuery('');
    }
  }, "Limpar"), /*#__PURE__*/React.createElement(Button, {
    iconLeft: "plus",
    onClick: onCreate
  }, "Criar tarefa"));
}
function Stats({
  tasks
}) {
  const {
    StatGroup
  } = window.DS;
  const n = p => tasks.filter(t => t.priority === p).length * 6 + (p === 'medium' ? 4 : 0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StatGroup, {
    items: [{
      icon: 'flag',
      iconColor: 'var(--priority-low)',
      label: 'Baixa prioridade',
      value: n('low')
    }, {
      icon: 'flag',
      iconColor: 'var(--priority-medium)',
      label: 'Média prioridade',
      value: n('medium')
    }, {
      icon: 'flag',
      iconColor: 'var(--priority-high)',
      label: 'Alta prioridade',
      value: n('high')
    }]
  }), /*#__PURE__*/React.createElement(StatGroup, {
    items: [{
      icon: 'clipboard-list',
      iconColor: 'var(--blue-500)',
      label: 'Total de tarefas',
      value: 110 + tasks.length
    }, {
      icon: 'clipboard-check',
      iconColor: 'var(--green-500)',
      label: 'Concluídas',
      value: 217 + tasks.filter(t => t.status === 'done').length
    }, {
      icon: 'alarm-clock',
      iconColor: 'var(--red-500)',
      label: 'Atrasadas',
      value: 27 + tasks.filter(t => t.status === 'overdue').length
    }]
  }));
}
function BoardView({
  tasks,
  onOpen
}) {
  const {
    ColumnHeader,
    TaskCard
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
      gap: 0,
      flex: 1,
      minHeight: 0
    }
  }, COLS.map((c, i) => {
    const list = tasks.filter(t => t.status === c);
    return /*#__PURE__*/React.createElement("div", {
      key: c,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '0 16px',
        borderLeft: i ? '1px solid var(--border-subtle)' : 'none',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(ColumnHeader, {
      status: c,
      count: list.length
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: 24,
        margin: '0 -4px',
        padding: '0 4px 24px'
      }
    }, list.map(t => /*#__PURE__*/React.createElement(TaskCard, {
      key: t.id,
      title: t.title,
      priority: t.priority,
      assignee: t.assignee,
      extraAssignees: t.extra,
      dueDate: t.due,
      subtasks: t.subtasks,
      comments: t.comments,
      onClick: () => onOpen(t)
    }))));
  }));
}
const STATUS_LABEL = {
  todo: 'A fazer',
  overdue: 'Atrasado',
  doing: 'Em andamento',
  done: 'Concluído'
};
const STATUS_TONE = {
  todo: 'neutral',
  overdue: 'danger',
  doing: 'info',
  done: 'success'
};
function ListView({
  tasks,
  onOpen
}) {
  const {
    PriorityTag,
    Avatar,
    Badge
  } = window.DS;
  const th = {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--neutral-25)'
  };
  const td = {
    fontSize: 13,
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-subtle)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Tarefa"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Prioridade"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Respons\xE1vel"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Prazo"))), /*#__PURE__*/React.createElement("tbody", null, tasks.map(t => /*#__PURE__*/React.createElement("tr", {
    key: t.id,
    onClick: () => onOpen(t),
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontWeight: 500,
      fontSize: 14
    }
  }, t.title), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: STATUS_TONE[t.status]
  }, STATUS_LABEL[t.status])), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement(PriorityTag, {
    level: t.priority
  })), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 6,
      alignItems: 'center',
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: t.assignee.name,
    color: t.assignee.color,
    size: 18
  }), t.assignee.name)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      color: 'var(--text-secondary)'
    }
  }, t.due))))));
}
Object.assign(window, {
  Toolbar,
  Stats,
  BoardView,
  ListView,
  STATUS_LABEL
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tasks/Board.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tasks/Sidebar.jsx
try { (() => {
const NAV = [[['house', 'Início'], ['calendar', 'Agenda'], ['clipboard-list', 'Tarefas'], ['briefcase', 'Projetos'], ['presentation', 'Aulas'], ['file-pen-line', 'Avaliações'], ['id-card', 'Matrículas'], ['contact', 'Contatos']], [['user', 'Perfil'], ['file-check', 'Aprovações'], ['users', 'Turmas'], ['notebook-pen', 'Diário']], [['layout-dashboard', 'Painéis'], ['users-round', 'Equipe'], ['file-badge', 'Certificados'], ['file-user', 'Relatórios'], ['receipt-text', 'Faturas']]];
function Sidebar({
  active = 'Tarefas',
  onNavigate
}) {
  const {
    IconButton,
    Tooltip
  } = window.DS;
  const item = ([icon, label]) => /*#__PURE__*/React.createElement(Tooltip, {
    key: label,
    label: label,
    placement: "right"
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: icon,
    label: label,
    active: label === active,
    onClick: () => onNavigate && onNavigate(label)
  }));
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--sidebar-width)',
      flex: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '10px 0 14px',
      background: 'var(--surface-page)',
      borderRight: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: 'var(--purple-700)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 18px/1 var(--font-display)',
      marginBottom: 14
    }
  }, "p"), NAV.map((g, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 1,
      background: 'var(--border-subtle)',
      margin: '6px 0'
    }
  }), g.map(item))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), item(['sliders-horizontal', 'Configurações']), item(['circle-help', 'Ajuda']));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tasks/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tasks/TaskDialog.jsx
try { (() => {
function TaskDialog({
  task,
  onClose,
  onSave
}) {
  const {
    Dialog,
    Input,
    Select,
    Button
  } = window.DS;
  const isNew = !task.id;
  const [t, setT] = React.useState({
    title: '',
    status: 'todo',
    priority: 'medium',
    assignee: {
      name: 'Amanda Nur',
      color: 'var(--blue-500)'
    },
    due: '20 fev, 2025',
    ...task
  });
  return /*#__PURE__*/React.createElement(Dialog, {
    title: isNew ? 'Nova tarefa' : 'Editar tarefa',
    description: isNew ? 'A tarefa entra na coluna escolhida.' : null,
    onClose: onClose,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: onClose
    }, "Cancelar"), /*#__PURE__*/React.createElement(Button, {
      disabled: !t.title.trim(),
      onClick: () => onSave(t)
    }, isNew ? 'Criar tarefa' : 'Salvar'))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    size: "md",
    label: "T\xEDtulo",
    placeholder: "Ex.: Revisar plano de aula",
    value: t.title,
    onChange: e => setT({
      ...t,
      title: e.target.value
    }),
    autoFocus: true
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Status",
    value: t.status,
    onChange: v => setT({
      ...t,
      status: v
    }),
    options: Object.entries(window.STATUS_LABEL).map(([value, label]) => ({
      value,
      label
    }))
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Prioridade",
    value: t.priority,
    onChange: v => setT({
      ...t,
      priority: v
    }),
    options: [{
      value: 'low',
      label: 'Baixa'
    }, {
      value: 'medium',
      label: 'Média'
    }, {
      value: 'high',
      label: 'Alta'
    }]
  })), /*#__PURE__*/React.createElement(Input, {
    size: "md",
    label: "Prazo",
    value: t.due,
    onChange: e => setT({
      ...t,
      due: e.target.value
    }),
    iconLeft: "calendar"
  })));
}
window.TaskDialog = TaskDialog;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tasks/TaskDialog.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tasks/Topbar.jsx
try { (() => {
function Topbar({
  title = 'Tarefas',
  onLogout
}) {
  const {
    Input,
    Button,
    IconButton,
    Avatar,
    Icon
  } = window.DS;
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--topbar-height)',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 20px',
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 15,
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right-from-line",
    size: 18
  }), title), /*#__PURE__*/React.createElement(Input, {
    size: "sm",
    variant: "filled",
    iconLeft: "search",
    placeholder: "Buscar\u2026",
    style: {
      width: 280
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "upgrade",
    size: "sm",
    iconLeft: "zap"
  }, "Upgrade"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "bell",
    label: "Notifica\xE7\xF5es",
    variant: "outline",
    size: "sm",
    dot: true
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    title: "Sair",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: "Vit\xF3ria",
    size: 30,
    color: "var(--purple-600)",
    ring: true
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 14
  }))));
}
window.Topbar = Topbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tasks/Topbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/tasks/data.js
try { (() => {
window.TASK_DATA = [{
  id: 1,
  status: 'todo',
  title: 'Planejamento colaborativo com outras turmas',
  priority: 'high',
  assignee: {
    name: 'Taufik Hidayat'
  },
  extra: 1,
  due: '12 fev, 2025',
  subtasks: 2
}, {
  id: 2,
  status: 'todo',
  title: 'Preparar e revisar planos de aula',
  priority: 'medium',
  assignee: {
    name: 'Yahyo Prayoga Dinata'
  },
  due: '12 fev, 2025',
  comments: 3
}, {
  id: 3,
  status: 'todo',
  title: 'Material preparatório',
  priority: 'low',
  assignee: {
    name: 'Aditya Irawan'
  },
  extra: 2,
  due: '12 fev, 2025',
  comments: 3
}, {
  id: 4,
  status: 'todo',
  title: 'Planejamento colaborativo',
  priority: 'medium',
  assignee: {
    name: 'Rizky Kurniawan',
    color: 'var(--amber-500)'
  },
  due: '14 fev, 2025',
  comments: 1
}, {
  id: 5,
  status: 'overdue',
  title: 'Documentação da turma',
  priority: 'medium',
  assignee: {
    name: 'Sophia Bannett',
    color: 'var(--green-500)'
  },
  due: '12 fev, 2025'
}, {
  id: 6,
  status: 'doing',
  title: 'Documentação da turma',
  priority: 'high',
  assignee: {
    name: 'Amanda Nur',
    color: 'var(--blue-500)'
  },
  due: '12 fev, 2025',
  subtasks: 2,
  comments: 3
}, {
  id: 7,
  status: 'doing',
  title: 'Avaliação e feedback',
  priority: 'low',
  assignee: {
    name: 'Aditya Irawan'
  },
  due: '12 fev, 2025',
  comments: 3
}, {
  id: 8,
  status: 'done',
  title: 'Acompanhamento do bem-estar dos alunos',
  priority: 'medium',
  assignee: {
    name: 'Amanda Nur',
    color: 'var(--blue-500)'
  },
  due: '12 fev, 2025',
  subtasks: 2,
  comments: 3
}, {
  id: 9,
  status: 'done',
  title: 'Corrigir e registrar avaliações',
  priority: 'low',
  assignee: {
    name: 'Taufik Hidayat'
  },
  due: '12 fev, 2025',
  subtasks: 2,
  comments: 3
}, {
  id: 10,
  status: 'done',
  title: 'Preparar e revisar planos de aula',
  priority: 'medium',
  assignee: {
    name: 'Amanda Nur',
    color: 'var(--blue-500)'
  },
  due: '12 fev, 2025',
  subtasks: 2,
  comments: 3
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/tasks/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.PriorityTag = __ds_scope.PriorityTag;

__ds_ns.StatGroup = __ds_scope.StatGroup;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.ColumnHeader = __ds_scope.ColumnHeader;

__ds_ns.TaskCard = __ds_scope.TaskCard;

})();
